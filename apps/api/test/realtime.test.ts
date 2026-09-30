import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import WebSocket from "ws";
import {
  applyServerEvent,
  realtimePath,
  serverEventSchema,
  type ServerEvent,
  type VenueState,
} from "@joymusic/shared";
import type { TestContext } from "./helpers/context";
import { addMember, registerOwner } from "./helpers/factories";
import { createFixture, newContext, type Fixture } from "./helpers/flow";

interface Client {
  socket: WebSocket;
  messages: Record<string, unknown>[];
  events(): ServerEvent[];
  waitFor(
    predicate: (message: Record<string, unknown>) => boolean,
    ms?: number,
  ): Promise<Record<string, unknown>>;
  settle(ms?: number): Promise<void>;
  closed: Promise<number>;
}

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("realtime hub", () => {
  let context: TestContext;
  let baseUrl: string;
  const opened: WebSocket[] = [];

  beforeAll(async () => {
    context = await newContext({ deps: { publisher: undefined as never } });
    await context.app.listen({ host: "127.0.0.1", port: 0 });
    const address = context.app.server.address();
    if (!address || typeof address === "string") throw new Error("server is not listening");
    baseUrl = `ws://127.0.0.1:${address.port}`;
  });
  afterEach(() => {
    for (const socket of opened.splice(0)) socket.terminate();
  });
  afterAll(async () => {
    await context.close();
  });

  function connect(
    fixture: Fixture,
    params: { role?: string; token?: string; venue?: string },
    headers: Record<string, string> = {},
  ): Promise<Client> {
    const query = new URLSearchParams({ venue: params.venue ?? fixture.venue.slug });
    if (params.role) query.set("role", params.role);
    if (params.token) query.set("token", params.token);
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`${baseUrl}${realtimePath}?${query.toString()}`, { headers });
      opened.push(socket);
      const messages: Record<string, unknown>[] = [];
      const listeners: (() => void)[] = [];
      let closeResolve: (code: number) => void = () => undefined;
      const closed = new Promise<number>((done) => {
        closeResolve = done;
      });
      socket.on("message", (data) => {
        messages.push(JSON.parse(data.toString()) as Record<string, unknown>);
        for (const listener of listeners) listener();
      });
      socket.on("close", (code) => closeResolve(code));
      socket.on("unexpected-response", (_request, response) => {
        reject(
          Object.assign(new Error(`status ${response.statusCode}`), {
            status: response.statusCode,
          }),
        );
      });
      socket.on("error", () => undefined);
      const client: Client = {
        socket,
        messages,
        closed,
        events: () =>
          messages
            .filter((message) => "seq" in message)
            .map((message) => serverEventSchema.parse(message)),
        waitFor(predicate, ms = 5000) {
          return new Promise((done, fail) => {
            const check = () => {
              const found = messages.find(predicate);
              if (found) {
                clearTimeout(timer);
                done(found);
                return true;
              }
              return false;
            };
            const timer = setTimeout(() => fail(new Error("timed out waiting for message")), ms);
            if (!check()) listeners.push(() => void check());
          });
        },
        async settle(ms = 150) {
          await pause(ms);
        },
      };
      socket.on("open", () => resolve(client));
    });
  }

  async function rejection(promise: Promise<Client>): Promise<number> {
    try {
      await promise;
    } catch (error) {
      return (error as { status: number }).status;
    }
    throw new Error("connection was accepted");
  }

  const isType = (type: string) => (message: Record<string, unknown>) => message.type === type;

  it("sends an audience filtered snapshot on connect", async () => {
    const fixture = await createFixture(context);
    const alice = await fixture.guest();
    await fixture.api.ok("requestCreate", {
      token: alice.token,
      params: { slug: fixture.venue.slug },
      body: { trackId: "deezer:101", note: "private note", dedicatedTo: "Nodira" },
    });
    const tv = await connect(fixture, { role: "tv" });
    const snapshot = serverEventSchema.parse(await tv.waitFor(isType("state.snapshot")));
    if (snapshot.type !== "state.snapshot") throw new Error("expected snapshot");
    expect(snapshot.venueId).toBe(fixture.venue.id);
    expect(snapshot.seq).toBe(snapshot.data.seq);
    expect(snapshot.data.session?.id).toBe(fixture.session.id);
    expect(snapshot.data.pending).toHaveLength(1);
    expect(snapshot.data.pending[0]).toMatchObject({ note: null, dedicatedTo: null, mine: false });

    const guest = await connect(fixture, { role: "guest", token: alice.token });
    const guestSnapshot = serverEventSchema.parse(await guest.waitFor(isType("state.snapshot")));
    if (guestSnapshot.type !== "state.snapshot") throw new Error("expected snapshot");
    expect(guestSnapshot.data.pending[0]).toMatchObject({ note: null, mine: true });

    const dj = await connect(fixture, { role: "dj", token: fixture.owner.accessToken });
    const djSnapshot = serverEventSchema.parse(await dj.waitFor(isType("state.snapshot")));
    if (djSnapshot.type !== "state.snapshot") throw new Error("expected snapshot");
    expect(djSnapshot.data.pending[0]).toMatchObject({
      note: "private note",
      dedicatedTo: "Nodira",
    });
  });

  it("broadcasts ordered events, scrubs pending requests for guests and tv, and keeps the reducer in sync", async () => {
    const fixture = await createFixture(context);
    const token = fixture.owner.accessToken;
    const tv = await connect(fixture, { role: "tv" });
    const guestClient = await connect(fixture, { role: "guest" });
    const dj = await connect(fixture, { role: "dj", token });
    for (const client of [tv, guestClient, dj]) await client.waitFor(isType("state.snapshot"));

    const alice = await fixture.guest();
    const bob = await fixture.guest();
    const created = await fixture.api.ok("requestCreate", {
      token: alice.token,
      params: { slug: fixture.venue.slug },
      body: { trackId: "deezer:101", note: "hello dj", dedicatedTo: "Dilnoza" },
    });
    const id = created.request.id;
    await fixture.api.ok("requestVote", { token: bob.token, params: { id } });
    await fixture.api.ok("djRequestAccept", { token, params: { id } });
    await fixture.api.ok("djRequestPlay", { token, params: { id } });
    await fixture.api.ok("djNowPlayingSet", {
      token,
      params: { sessionId: fixture.session.id },
      body: { title: "Levitating", artist: "Dua Lipa" },
    });
    await fixture.api.ok("djSessionSettings", {
      token,
      params: { sessionId: fixture.session.id },
      body: { showArtwork: false },
    });
    await fixture.api.ok("djSessionEnd", { token, params: { sessionId: fixture.session.id } });

    const expectedTypes = [
      "request.upserted",
      "request.upserted",
      "request.upserted",
      "request.upserted",
      "nowplaying.updated",
      "request.upserted",
      "nowplaying.updated",
      "settings.updated",
      "nowplaying.updated",
      "session.changed",
    ];
    for (const client of [tv, guestClient, dj]) {
      await client.waitFor((message) => message.type === "session.changed");
      const events = client.events().filter((event) => event.type !== "state.snapshot");
      expect(events.map((event) => event.type)).toEqual(expectedTypes.slice(0, events.length));
      expect(events).toHaveLength(expectedTypes.length);
      const seqs = events.map((event) => event.seq);
      seqs.slice(1).forEach((seq, index) => expect(seq).toBe((seqs[index] as number) + 1));
    }

    const firstUpsert = (client: Client) => {
      const event = client.events().find((candidate) => candidate.type === "request.upserted");
      if (event?.type !== "request.upserted") throw new Error("missing upsert");
      return event.data.request;
    };
    expect(firstUpsert(tv)).toMatchObject({
      status: "pending",
      note: null,
      dedicatedTo: null,
      mine: false,
    });
    expect(firstUpsert(guestClient)).toMatchObject({ note: null, dedicatedTo: null });
    expect(firstUpsert(dj)).toMatchObject({ note: "hello dj", dedicatedTo: "Dilnoza" });

    const replay = (client: Client): VenueState => {
      const all = client.events();
      const snapshot = all[0];
      if (snapshot?.type !== "state.snapshot")
        throw new Error("first message must be the snapshot");
      return all.slice(1).reduce(applyServerEvent, snapshot.data);
    };
    const finalDj = replay(dj);
    expect(finalDj.session).toBeNull();
    expect(finalDj.nowPlaying?.title).toBe("Levitating");
    expect(finalDj.venue.settings.showArtwork).toBe(false);
    expect(replay(tv).venue.settings.showArtwork).toBe(false);
  });

  it("scrubs the notes of pending requests replayed through votes", async () => {
    const fixture = await createFixture(context);
    const tv = await connect(fixture, { role: "tv" });
    await tv.waitFor(isType("state.snapshot"));
    const alice = await fixture.guest();
    const bob = await fixture.guest();
    const created = await fixture.api.ok("requestCreate", {
      token: alice.token,
      params: { slug: fixture.venue.slug },
      body: { trackId: "deezer:102", note: "secret" },
    });
    await fixture.api.ok("requestVote", { token: bob.token, params: { id: created.request.id } });
    await tv.waitFor((message) => message.type === "request.upserted" && message.seq === 2);
    const serialized = JSON.stringify(tv.messages);
    expect(serialized).not.toContain("secret");
  });

  it("answers ping with pong and resyncs only when the client is behind", async () => {
    const fixture = await createFixture(context);
    const tv = await connect(fixture, { role: "tv" });
    await tv.waitFor(isType("state.snapshot"));
    tv.socket.send(JSON.stringify({ type: "ping" }));
    const pong = await tv.waitFor(isType("pong"));
    expect(Date.parse(pong.serverTime as string)).not.toBeNaN();

    const guest = await fixture.guest();
    for (const trackId of ["deezer:101", "deezer:102"]) {
      await fixture.api.ok("requestCreate", {
        token: guest.token,
        params: { slug: fixture.venue.slug },
        body: { trackId },
      });
    }
    await tv.waitFor((message) => message.seq === 3);
    const before = tv.messages.filter(isType("state.snapshot")).length;

    tv.socket.send(JSON.stringify({ type: "resync", lastSeq: 3 }));
    tv.socket.send(JSON.stringify({ type: "ping" }));
    await tv.waitFor(
      (message) => message.type === "pong" && tv.messages.filter(isType("pong")).length === 2,
    );
    await tv.settle();
    expect(tv.messages.filter(isType("state.snapshot"))).toHaveLength(before);

    tv.socket.send(JSON.stringify({ type: "resync", lastSeq: 1 }));
    await tv.waitFor(() => tv.messages.filter(isType("state.snapshot")).length === before + 1);
    const snapshot = tv.messages.filter(isType("state.snapshot")).at(-1) as {
      seq: number;
      data: VenueState;
    };
    expect(snapshot.seq).toBe(3);
    expect(snapshot.data.pending).toHaveLength(2);
  });

  it("enforces role authentication before the upgrade", async () => {
    const fixture = await createFixture(context);
    expect(await rejection(connect(fixture, { role: "dj" }))).toBe(401);
    expect(await rejection(connect(fixture, { role: "dj", token: "garbage" }))).toBe(401);
    const guest = await fixture.guest();
    expect(await rejection(connect(fixture, { role: "dj", token: guest.token }))).toBe(401);
    const stranger = await registerOwner(context);
    expect(await rejection(connect(fixture, { role: "dj", token: stranger.accessToken }))).toBe(
      404,
    );
    const teammate = await addMember(context, fixture.owner, "dj");
    const allowed = await connect(fixture, { role: "dj", token: teammate.accessToken });
    await allowed.waitFor(isType("state.snapshot"));
    expect(await rejection(connect(fixture, { role: "tv", venue: "no-such-venue" }))).toBe(404);
    expect(await rejection(connect(fixture, { role: "boss" }))).toBe(400);
    const anonymousGuest = await connect(fixture, { role: "guest", token: "expired-or-bad" });
    await anonymousGuest.waitFor(isType("state.snapshot"));
    const defaultRole = await connect(fixture, {});
    await defaultRole.waitFor(isType("state.snapshot"));
  });

  it("checks the origin against the cors allow list", async () => {
    const fixture = await createFixture(context);
    expect(
      await rejection(connect(fixture, { role: "tv" }, { origin: "https://evil.example" })),
    ).toBe(403);
    const allowed = await connect(
      fixture,
      { role: "tv" },
      { origin: "https://admin.joymusic.test" },
    );
    await allowed.waitFor(isType("state.snapshot"));
  });

  it("closes connections that send oversized, binary or excessive invalid messages", async () => {
    const fixture = await createFixture(context);
    const big = await connect(fixture, { role: "tv" });
    await big.waitFor(isType("state.snapshot"));
    big.socket.send("x".repeat(context.config.realtime.maxMessageBytes + 10));
    expect(await big.closed).toBe(1009);

    const binary = await connect(fixture, { role: "tv" });
    await binary.waitFor(isType("state.snapshot"));
    binary.socket.send(Buffer.from([1, 2, 3]));
    expect(await binary.closed).toBe(1003);

    const noisy = await connect(fixture, { role: "tv" });
    await noisy.waitFor(isType("state.snapshot"));
    for (let index = 0; index < 12; index += 1) noisy.socket.send("not json");
    expect(await noisy.closed).toBe(1008);
  });

  it("limits connections per address and frees the slot on close", async () => {
    const limited = await newContext({
      deps: { publisher: undefined as never },
      env: { WS_MAX_CONNECTIONS_PER_IP: "2" },
    });
    try {
      await limited.app.listen({ host: "127.0.0.1", port: 0 });
      const address = limited.app.server.address();
      if (!address || typeof address === "string") throw new Error("server is not listening");
      const fixture = await createFixture(limited);
      const open = (): Promise<Client> => {
        const saved = baseUrl;
        baseUrl = `ws://127.0.0.1:${address.port}`;
        try {
          return connect(fixture, { role: "tv" });
        } finally {
          baseUrl = saved;
        }
      };
      const first = await open();
      await open();
      expect(await rejection(open())).toBe(429);
      first.socket.close();
      await first.closed;
      await pause(100);
      const replacement = await open();
      await replacement.waitFor(isType("state.snapshot"));
    } finally {
      await limited.close();
    }
  });

  it.skipIf(!process.env.REDIS_URL)(
    "delivers events across app instances through redis pub/sub",
    async () => {
      const remote = await newContext({ deps: { publisher: undefined as never } });
      try {
        await remote.app.listen({ host: "127.0.0.1", port: 0 });
        const address = remote.app.server.address();
        if (!address || typeof address === "string") throw new Error("server is not listening");
        const fixture = await createFixture(context);
        const saved = baseUrl;
        baseUrl = `ws://127.0.0.1:${address.port}`;
        const tv = await connect(fixture, { role: "tv" });
        baseUrl = saved;
        await tv.waitFor(isType("state.snapshot"));
        const guest = await fixture.guest();
        const created = await fixture.api.ok("requestCreate", {
          token: guest.token,
          params: { slug: fixture.venue.slug },
          body: { trackId: "deezer:101", note: "cross instance" },
        });
        const event = await tv.waitFor(isType("request.upserted"));
        expect(event).toMatchObject({ venueId: fixture.venue.id });
        expect((event.data as { request: { id: string; note: null } }).request).toMatchObject({
          id: created.request.id,
          note: null,
        });
      } finally {
        await remote.close();
      }
    },
  );
});
