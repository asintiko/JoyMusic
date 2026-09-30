import { describe, expect, it } from "vitest";
import { createAuthService } from "../../src/core/auth-service";
import type { CoreEnvironment } from "../../src/core/environment";
import { createRealtimeHub } from "../../src/core/realtime-hub";
import type { RealtimeUpdate } from "../../src/common/bridge";
import { createFakeApi } from "./support/fake-api";
import { createManualTime } from "./support/manual-time";
import { createMemoryFiles, createMemorySecrets } from "./support/memory-stores";

class FakeSocket {
  static readonly OPEN = 1;
  static instances: FakeSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(readonly url: string) {
    FakeSocket.instances.push(this);
  }
  open() {
    this.readyState = 1;
    this.onopen?.();
  }
  receive(message: unknown) {
    this.onmessage?.({ data: JSON.stringify(message) });
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

const venue = {
  id: "ven_1",
  slug: "joy-demo-club",
  name: "Joy Demo Club",
  city: null,
  theme: "club",
  logoUrl: null,
  coverUrl: null,
  settings: {
    requestsOpen: true,
    maxRequestsPerDevice: 3,
    windowMinutes: 30,
    duplicateWindowMinutes: 60,
    allowFreeText: true,
    allowNotes: true,
    showArtwork: true,
    defaultLocale: "uz",
  },
};

function snapshot(seq: number) {
  return {
    seq,
    venueId: "ven_1",
    at: "2026-09-30T10:00:00.000Z",
    type: "state.snapshot",
    data: {
      venue,
      session: { id: "ses_1", djName: "DJ", startedAt: "2026-09-30T09:00:00.000Z" },
      nowPlaying: null,
      queue: [],
      pending: [],
      recentlyPlayed: [],
      seq,
      serverTime: "2026-09-30T10:00:00.000Z",
    },
  };
}

function request(id: string) {
  return {
    id,
    sessionId: "ses_1",
    venueId: "ven_1",
    track: null,
    freeText: { artist: "A", title: "T" },
    title: "T",
    artist: "A",
    artworkUrl: null,
    note: "hello",
    dedicatedTo: null,
    tableLabel: "Table 3",
    votes: 1,
    status: "pending",
    declineReason: null,
    position: null,
    mine: false,
    createdAt: "2026-09-30T10:00:01.000Z",
    updatedAt: "2026-09-30T10:00:01.000Z",
  };
}

async function setup() {
  FakeSocket.instances = [];
  const fake = createFakeApi();
  const time = createManualTime();
  const env: CoreEnvironment = {
    config: { apiUrl: "http://api.test", adminUrl: "http://admin.test", webUrl: "http://web.test" },
    fetch: fake.fetch,
    WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
    secrets: createMemorySecrets(),
    files: createMemoryFiles(),
    openExternal: async () => undefined,
    now: () => Date.parse("2026-09-30T10:00:00.000Z"),
    timers: time,
    adapterFactory: () => null,
  };
  const auth = createAuthService(env);
  await auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
  let closed = 0;
  const hub = createRealtimeHub(env, auth, { onClosed: () => (closed += 1) });
  return { hub, closedCount: () => closed };
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 5));
}

describe("realtime hub", () => {
  it("connects as dj with the access token and applies the snapshot and events", async () => {
    const { hub } = await setup();
    const updates: RealtimeUpdate[] = [];
    hub.subscribe({ venue: "joy-demo-club", role: "dj" }, (update) => updates.push(update));
    await settle();
    const socket = FakeSocket.instances[0] as FakeSocket;
    const url = new URL(socket.url);
    expect(url.pathname).toBe("/v1/ws");
    expect(url.searchParams.get("role")).toBe("dj");
    expect(url.searchParams.get("token")).toBe("access-1");
    socket.open();
    socket.receive(snapshot(4));
    socket.receive({
      type: "request.upserted",
      seq: 5,
      venueId: "ven_1",
      at: "2026-09-30T10:00:02.000Z",
      data: { request: request("req_1") },
    });
    const latest = updates.at(-1);
    expect(latest?.status).toBe("open");
    expect(latest?.state?.pending.map((item) => item.id)).toEqual(["req_1"]);
    expect(latest?.state?.pending[0]?.note).toBe("hello");
    hub.dispose();
  });

  it("does not send a token for the anonymous stage role", async () => {
    const { hub } = await setup();
    hub.subscribe({ venue: "joy-demo-club", role: "tv" }, () => undefined);
    await settle();
    const url = new URL((FakeSocket.instances[0] as FakeSocket).url);
    expect(url.searchParams.get("role")).toBe("tv");
    expect(url.searchParams.has("token")).toBe(false);
    hub.dispose();
  });

  it("shares one connection between subscribers and closes it with the last one", async () => {
    const { hub } = await setup();
    const target = { venue: "joy-demo-club", role: "dj" as const };
    const first = hub.subscribe(target, () => undefined);
    const lateUpdates: RealtimeUpdate[] = [];
    await settle();
    const socket = FakeSocket.instances[0] as FakeSocket;
    socket.open();
    socket.receive(snapshot(1));
    const second = hub.subscribe(target, (update) => lateUpdates.push(update));
    expect(FakeSocket.instances).toHaveLength(1);
    expect(lateUpdates[0]?.state?.session?.id).toBe("ses_1");
    first();
    expect(socket.readyState).toBe(1);
    second();
    expect(socket.readyState).toBe(3);
  });

  it("asks the server to resync after a gap and on demand", async () => {
    const { hub } = await setup();
    hub.subscribe({ venue: "joy-demo-club", role: "dj" }, () => undefined);
    await settle();
    const socket = FakeSocket.instances[0] as FakeSocket;
    socket.open();
    socket.receive(snapshot(1));
    socket.receive({
      type: "settings.updated",
      seq: 5,
      venueId: "ven_1",
      at: "2026-09-30T10:00:05.000Z",
      data: { settings: { ...venue.settings, requestsOpen: false } },
    });
    expect(socket.sent.map((text) => JSON.parse(text))).toContainEqual({
      type: "resync",
      lastSeq: 1,
    });
    hub.resyncAll();
    expect(socket.sent.length).toBeGreaterThanOrEqual(2);
    hub.dispose();
  });

  it("reports closed connections so connectivity can be re-probed", async () => {
    const { hub, closedCount } = await setup();
    hub.subscribe({ venue: "joy-demo-club", role: "dj" }, () => undefined);
    await settle();
    const socket = FakeSocket.instances[0] as FakeSocket;
    socket.open();
    socket.close();
    expect(closedCount()).toBe(1);
    hub.dispose();
  });
});
