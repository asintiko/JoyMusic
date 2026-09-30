import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { djSessions, playLog, requests } from "../src/db/schema";
import { errorCode } from "./helpers/api";
import type { TestContext } from "./helpers/context";
import { addMember, registerOwner, startSession } from "./helpers/factories";
import { createFixture, newContext, type Fixture } from "./helpers/flow";

describe("dj flow", () => {
  let context: TestContext;
  beforeAll(async () => {
    context = await newContext();
  });
  afterAll(async () => {
    await context.close();
  });

  async function request(fixture: Fixture, guestToken: string, trackId: string) {
    const created = await fixture.api.ok("requestCreate", {
      token: guestToken,
      params: { slug: fixture.venue.slug },
      body: { trackId },
    });
    return created.request.id;
  }

  it("keeps one active session per venue and reuses the session of the same dj", async () => {
    const fixture = await createFixture(context);
    const again = await fixture.api.call("djSessionStart", {
      token: fixture.owner.accessToken,
      params: { venueId: fixture.venue.id },
    });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ id: fixture.session.id });

    const other = await addMember(context, fixture.owner, "dj");
    const taken = await fixture.api.call("djSessionStart", {
      token: other.accessToken,
      params: { venueId: fixture.venue.id },
    });
    expect(taken.status).toBe(409);
    expect(errorCode(taken)).toBe("conflict");

    await fixture.api.ok("djSessionEnd", {
      token: fixture.owner.accessToken,
      params: { sessionId: fixture.session.id },
    });
    const next = await fixture.api.ok("djSessionStart", {
      token: other.accessToken,
      params: { venueId: fixture.venue.id },
    });
    expect(next.id).not.toBe(fixture.session.id);
    expect(next.djId).toBe(other.userId);
  });

  it("starts concurrent sessions for one venue safely", async () => {
    const fixture = await createFixture(context, { startSession: false });
    const rivals = await Promise.all([1, 2, 3].map(() => addMember(context, fixture.owner, "dj")));
    const results = await Promise.all(
      rivals.map((rival) =>
        fixture.api.call("djSessionStart", {
          token: rival.accessToken,
          params: { venueId: fixture.venue.id },
        }),
      ),
    );
    expect(results.map((result) => result.status).sort()).toEqual([201, 409, 409]);
  });

  it("ends stale sessions when another dj starts and blocks foreign organizations", async () => {
    const fixture = await createFixture(context, { startSession: false });
    const stale = await startSession(
      context,
      fixture.venue.id,
      fixture.owner.userId,
      new Date(Date.now() - 19 * 3_600_000),
    );
    const other = await addMember(context, fixture.owner, "dj");
    const started = await fixture.api.ok("djSessionStart", {
      token: other.accessToken,
      params: { venueId: fixture.venue.id },
    });
    expect(started.id).not.toBe(stale);
    const [old] = await context.deps.db.select().from(djSessions).where(eq(djSessions.id, stale));
    expect(old?.endedAt).not.toBeNull();

    const stranger = await registerOwner(context);
    const denied = await fixture.api.call("djSessionStart", {
      token: stranger.accessToken,
      params: { venueId: fixture.venue.id },
    });
    expect(denied.status).toBe(404);
    const deniedState = await fixture.api.call("djSessionState", {
      token: stranger.accessToken,
      params: { sessionId: started.id },
    });
    expect(deniedState.status).toBe(404);
    const anonymous = await fixture.api.call("djSessionState", {
      params: { sessionId: started.id },
    });
    expect(anonymous.status).toBe(401);
  });

  it("expires open requests when the session ends", async () => {
    const fixture = await createFixture(context);
    const guest = await fixture.guest();
    const pendingId = await request(fixture, guest.token, "deezer:101");
    const acceptedId = await request(fixture, guest.token, "deezer:102");
    await fixture.api.ok("djRequestAccept", {
      token: fixture.owner.accessToken,
      params: { id: acceptedId },
    });
    context.publisher.publish.mockClear();
    await fixture.api.ok("djSessionEnd", {
      token: fixture.owner.accessToken,
      params: { sessionId: fixture.session.id },
    });
    const rows = await context.deps.db
      .select()
      .from(requests)
      .where(eq(requests.venueId, fixture.venue.id));
    expect(rows.map((row) => row.status)).toEqual(["expired", "expired"]);
    expect(rows.find((row) => row.id === acceptedId)?.position).toBeNull();
    const types = context.publisher.publish.mock.calls.map(
      (call) => (call[1] as { type: string }).type,
    );
    expect(types.at(-1)).toBe("session.changed");
    expect(types.filter((type) => type === "request.upserted")).toHaveLength(2);
    const state = await fixture.api.ok("venueState", { params: { slug: fixture.venue.slug } });
    expect(state.session).toBeNull();
    expect(state.pending).toEqual([]);
    expect(pendingId).toBeTruthy();
    const late = await fixture.api.call("djRequestAccept", {
      token: fixture.owner.accessToken,
      params: { id: pendingId },
    });
    expect(late.status).toBe(409);
  });

  it("merges settings and publishes settings.updated", async () => {
    const fixture = await createFixture(context);
    context.publisher.publish.mockClear();
    const settings = await fixture.api.ok("djSessionSettings", {
      token: fixture.owner.accessToken,
      params: { sessionId: fixture.session.id },
      body: { maxRequestsPerDevice: 7, allowNotes: false },
    });
    expect(settings).toMatchObject({
      maxRequestsPerDevice: 7,
      allowNotes: false,
      requestsOpen: true,
    });
    expect(context.publisher.publish).toHaveBeenCalledWith(fixture.venue.id, {
      type: "settings.updated",
      data: { settings },
    });
    const state = await fixture.api.ok("venueState", { params: { slug: fixture.venue.slug } });
    expect(state.venue.settings.maxRequestsPerDevice).toBe(7);
    const invalid = await fixture.api.call("djSessionSettings", {
      token: fixture.owner.accessToken,
      params: { sessionId: fixture.session.id },
      body: { maxRequestsPerDevice: 0 },
    });
    expect(invalid.status).toBe(400);
  });

  it("adds tracks straight to the queue, reorders transactionally and validates the order", async () => {
    const fixture = await createFixture(context);
    const token = fixture.owner.accessToken;
    const params = { sessionId: fixture.session.id };
    const ids: string[] = [];
    for (const trackId of ["deezer:101", "deezer:102", "deezer:103"]) {
      const added = await fixture.api.call("djQueueAdd", { token, params, body: { trackId } });
      expect(added.status).toBe(201);
      const body = added.body as { id: string; status: string; position: number; mine: boolean };
      expect(body).toMatchObject({ status: "accepted", mine: false });
      ids.push(body.id);
    }
    const free = await fixture.api.ok("djQueueAdd", {
      token,
      params,
      body: { freeText: { artist: "Local Band", title: "Demo" }, note: "dj note" },
    });
    expect(free).toMatchObject({ position: 4, track: null, freeText: { artist: "Local Band" } });

    context.publisher.publish.mockClear();
    const [a, b, c] = ids as [string, string, string];
    await fixture.api.ok("djQueueReorder", { token, params, body: { order: [c, a] } });
    expect(context.publisher.publish).toHaveBeenCalledWith(fixture.venue.id, {
      type: "queue.reordered",
      data: { order: [c, a, b, free.id] },
    });
    const state = await fixture.api.ok("djSessionState", { token, params });
    expect(state.queue.map((item) => item.id)).toEqual([c, a, b, free.id]);
    expect(state.queue.map((item) => item.position)).toEqual([1, 2, 3, 4]);

    const duplicated = await fixture.api.call("djQueueReorder", {
      token,
      params,
      body: { order: [a, a] },
    });
    expect(duplicated.status).toBe(400);
    const unknown = await fixture.api.call("djQueueReorder", {
      token,
      params,
      body: { order: ["req_nope"] },
    });
    expect(unknown.status).toBe(400);
    const unchanged = await fixture.api.ok("djSessionState", { token, params });
    expect(unchanged.queue.map((item) => item.id)).toEqual([c, a, b, free.id]);
  });

  it("assigns increasing positions on accept and supports decline with a reason", async () => {
    const fixture = await createFixture(context);
    const token = fixture.owner.accessToken;
    const guest = await fixture.guest();
    const first = await request(fixture, guest.token, "deezer:101");
    const second = await request(fixture, (await fixture.guest()).token, "deezer:102");
    const third = await request(fixture, (await fixture.guest()).token, "deezer:103");
    expect(
      (await fixture.api.ok("djRequestAccept", { token, params: { id: second } })).position,
    ).toBe(1);
    expect(
      (await fixture.api.ok("djRequestAccept", { token, params: { id: first } })).position,
    ).toBe(2);
    const declined = await fixture.api.ok("djRequestDecline", {
      token,
      params: { id: third },
      body: { reason: "wrong vibe" },
    });
    expect(declined).toMatchObject({
      status: "declined",
      declineReason: "wrong vibe",
      position: null,
    });
    const wrongState = await fixture.api.call("djRequestPlayed", { token, params: { id: third } });
    expect(wrongState.status).toBe(409);
    const mine = await fixture.api.ok("requestsMine", {
      token: guest.token,
      params: { slug: fixture.venue.slug },
    });
    expect(mine.requests[0]).toMatchObject({ id: first, status: "accepted", position: 2 });
    const state = await fixture.api.ok("djSessionState", {
      token,
      params: { sessionId: fixture.session.id },
    });
    expect(state.queue.map((item) => item.id)).toEqual([second, first]);
    expect(state.pending).toEqual([]);
  });

  it("sorts pending by votes then age", async () => {
    const fixture = await createFixture(context);
    const guests = await Promise.all([fixture.guest(), fixture.guest(), fixture.guest()]);
    const early = await request(fixture, guests[0]!.token, "deezer:101");
    const popular = await request(fixture, guests[1]!.token, "deezer:102");
    const late = await request(fixture, guests[2]!.token, "deezer:103");
    await fixture.api.ok("requestVote", { token: guests[0]!.token, params: { id: popular } });
    await fixture.api.ok("requestVote", { token: guests[2]!.token, params: { id: popular } });
    await fixture.api.ok("requestVote", { token: guests[1]!.token, params: { id: late } });
    const state = await fixture.api.ok("venueState", { params: { slug: fixture.venue.slug } });
    expect(state.pending.map((item) => item.id)).toEqual([popular, late, early]);
    expect(state.pending.map((item) => item.votes)).toEqual([3, 2, 1]);
  });

  it("switches playing requests and closes play log entries", async () => {
    const fixture = await createFixture(context);
    const token = fixture.owner.accessToken;
    const guest = await fixture.guest();
    const first = await request(fixture, guest.token, "deezer:101");
    const second = await request(fixture, (await fixture.guest()).token, "deezer:102");
    await fixture.api.ok("djRequestPlay", { token, params: { id: first } });
    context.publisher.publish.mockClear();
    await fixture.api.ok("djRequestPlay", { token, params: { id: second } });
    const types = context.publisher.publish.mock.calls.map((call) => {
      const event = call[1] as { type: string; data: { request?: { id: string; status: string } } };
      return `${event.type}:${event.data.request?.id ?? ""}:${event.data.request?.status ?? ""}`;
    });
    expect(types).toEqual([
      `request.upserted:${first}:played`,
      `request.upserted:${second}:playing`,
      "nowplaying.updated::",
    ]);
    const logs = await context.deps.db
      .select()
      .from(playLog)
      .where(eq(playLog.sessionId, fixture.session.id));
    expect(logs).toHaveLength(2);
    expect(logs.filter((row) => row.endedAt === null)).toHaveLength(1);
    const idempotent = await fixture.api.ok("djRequestPlay", { token, params: { id: second } });
    expect(idempotent.status).toBe("playing");
    const skipped = await fixture.api.ok("djRequestPlayed", { token, params: { id: second } });
    expect(skipped.status).toBe("played");
    const state = await fixture.api.ok("djSessionState", {
      token,
      params: { sessionId: fixture.session.id },
    });
    expect(state.nowPlaying).toBeNull();
    expect(state.recentlyPlayed.map((item) => item.id).sort()).toEqual([first, second].sort());
  });

  it("links now playing to an accepted request by fuzzy artist and title", async () => {
    const fixture = await createFixture(context);
    const token = fixture.owner.accessToken;
    const params = { sessionId: fixture.session.id };
    const guest = await fixture.guest();
    const wanted = await request(fixture, guest.token, "deezer:103");
    const other = await request(fixture, (await fixture.guest()).token, "deezer:104");
    await fixture.api.ok("djRequestAccept", { token, params: { id: wanted } });
    await fixture.api.ok("djRequestAccept", { token, params: { id: other } });

    const unrelated = await fixture.api.ok("djNowPlayingSet", {
      token,
      params,
      body: { title: "Something Else", artist: "Nobody" },
    });
    expect(unrelated.requestId).toBeNull();

    const matched = await fixture.api.ok("djNowPlayingSet", {
      token,
      params,
      body: {
        title: "LEVITATING (Radio Edit)",
        artist: "Dua Lipa feat. DaBaby",
        bpm: 103,
        key: "6A",
        source: "serato",
      },
    });
    expect(matched).toMatchObject({
      requestId: wanted,
      source: "serato",
      bpm: 103,
      track: { id: "deezer:103" },
      durationSec: 200,
    });
    const state = await fixture.api.ok("djSessionState", { token, params });
    expect(state.queue.map((item) => item.id)).toEqual([other]);

    context.publisher.publish.mockClear();
    const repeat = await fixture.api.ok("djNowPlayingSet", {
      token,
      params,
      body: {
        title: "Levitating (Radio Edit)",
        artist: "Dua Lipa feat. DaBaby",
        bpm: 103,
        key: "6A",
        source: "serato",
      },
    });
    expect(repeat.requestId).toBe(wanted);
    expect(context.publisher.publish).not.toHaveBeenCalled();
    const logs = await context.deps.db
      .select()
      .from(playLog)
      .where(eq(playLog.sessionId, fixture.session.id));
    expect(logs).toHaveLength(2);

    await fixture.api.ok("djNowPlayingClear", { token, params });
    const cleared = await fixture.api.ok("djSessionState", { token, params });
    expect(cleared.nowPlaying).toBeNull();
    expect(cleared.recentlyPlayed.map((item) => item.id)).toEqual([wanted]);
    const [row] = await context.deps.db.select().from(requests).where(eq(requests.id, wanted));
    expect(row?.status).toBe("played");
  });

  it("links now playing explicitly by request id", async () => {
    const fixture = await createFixture(context);
    const token = fixture.owner.accessToken;
    const params = { sessionId: fixture.session.id };
    const guest = await fixture.guest();
    const wanted = await request(fixture, guest.token, "deezer:105");
    const playing = await fixture.api.ok("djNowPlayingSet", {
      token,
      params,
      body: { title: "Yellow (live)", artist: "Coldplay", requestId: wanted, source: "manual" },
    });
    expect(playing.requestId).toBe(wanted);
    const bad = await fixture.api.call("djNowPlayingSet", {
      token,
      params,
      body: { title: "X", artist: "Y", requestId: "req_none" },
    });
    expect(bad.status).toBe(404);
  });
});
