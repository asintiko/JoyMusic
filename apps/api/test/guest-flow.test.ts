import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { playLog, qrCodes, tracks } from "../src/db/schema";
import { errorCode } from "./helpers/api";
import type { TestContext } from "./helpers/context";
import { createFixture, newContext, sampleTracks } from "./helpers/flow";

describe("guest and dj happy path", () => {
  let context: TestContext;
  beforeAll(async () => {
    context = await newContext();
  });
  afterAll(async () => {
    await context.close();
  });

  it("runs join, search, request, merge, accept, play, now playing and played", async () => {
    const fixture = await createFixture(context);
    const { api, venue, owner, session } = fixture;
    const dj = { token: owner.accessToken };

    const publicVenue = await api.ok("venuePublic", { params: { slug: venue.slug } });
    expect(publicVenue).toMatchObject({ id: venue.id, slug: venue.slug });

    const alice = await fixture.guest();
    const bob = await fixture.guest();
    expect(alice.deviceId).not.toBe(bob.deviceId);

    const found = await api.ok("catalogSearch", { query: { q: "rayhon" } });
    expect(found.tracks.map((track) => track.id)).toEqual(["deezer:101"]);

    const created = await api.call("requestCreate", {
      token: alice.token,
      params: { slug: venue.slug },
      body: { track: found.tracks[0]!, note: "for my friends", dedicatedTo: "Dilnoza" },
    });
    expect(created.status).toBe(201);
    const first = created.body as {
      request: { id: string; mine: boolean; note: string };
      merged: boolean;
    };
    expect(first.merged).toBe(false);
    expect(first.request).toMatchObject({ mine: true, note: "for my friends" });
    const requestId = first.request.id;

    const [stored] = await context.deps.db.select().from(tracks).where(eq(tracks.id, "deezer:101"));
    expect(stored?.title).toBe("Sensiz");

    const merged = await api.ok("requestCreate", {
      token: bob.token,
      params: { slug: venue.slug },
      body: { trackId: "deezer:101" },
    });
    expect(merged.merged).toBe(true);
    expect(merged.request).toMatchObject({ id: requestId, votes: 2, mine: true, note: null });

    const again = await api.call("requestCreate", {
      token: bob.token,
      params: { slug: venue.slug },
      body: { trackId: "deezer:101" },
    });
    expect(again.status).toBe(409);
    const voteAgain = await api.call("requestVote", {
      token: alice.token,
      params: { id: requestId },
    });
    expect(voteAgain.status).toBe(409);

    const guestView = await api.ok("venueState", { params: { slug: venue.slug } });
    expect(guestView.session?.id).toBe(session.id);
    expect(guestView.pending).toHaveLength(1);
    expect(guestView.pending[0]).toMatchObject({ votes: 2, note: null, dedicatedTo: null });

    const djView = await api.ok("djSessionState", {
      token: owner.accessToken,
      params: { sessionId: session.id },
    });
    expect(djView.pending[0]).toMatchObject({ note: "for my friends", dedicatedTo: "Dilnoza" });

    const accepted = await api.ok("djRequestAccept", { ...dj, params: { id: requestId } });
    expect(accepted).toMatchObject({ status: "accepted", position: 1 });
    const stateAfterAccept = await api.ok("venueState", { params: { slug: venue.slug } });
    expect(stateAfterAccept.pending).toHaveLength(0);
    expect(stateAfterAccept.queue.map((item) => item.id)).toEqual([requestId]);

    const playing = await api.ok("djRequestPlay", { ...dj, params: { id: requestId } });
    expect(playing.status).toBe("playing");
    const playingState = await api.ok("venueState", { params: { slug: venue.slug } });
    expect(playingState.nowPlaying).toMatchObject({
      title: "Sensiz",
      artist: "Rayhon",
      source: "request",
      requestId,
      dedicatedTo: "Dilnoza",
    });
    expect(playingState.queue).toHaveLength(0);

    const nowPlaying = await api.ok("djNowPlayingSet", {
      ...dj,
      params: { sessionId: session.id },
      body: { title: "Levitating", artist: "Dua Lipa", bpm: 103, key: "6A", source: "rekordbox" },
    });
    expect(nowPlaying).toMatchObject({
      title: "Levitating",
      bpm: 103,
      key: "6A",
      source: "rekordbox",
      requestId: null,
    });
    const afterSwitch = await api.ok("djSessionState", {
      ...dj,
      params: { sessionId: session.id },
    });
    expect(afterSwitch.recentlyPlayed.map((item) => item.id)).toEqual([requestId]);
    expect(afterSwitch.nowPlaying?.title).toBe("Levitating");

    const played = await api.ok("djRequestPlayed", { ...dj, params: { id: requestId } });
    expect(played.status).toBe("played");

    const mine = await api.ok("requestsMine", { token: alice.token, params: { slug: venue.slug } });
    expect(mine.requests).toHaveLength(1);
    expect(mine.requests[0]).toMatchObject({
      id: requestId,
      status: "played",
      note: "for my friends",
    });
    const bobMine = await api.ok("requestsMine", {
      token: bob.token,
      params: { slug: venue.slug },
    });
    expect(bobMine.requests[0]).toMatchObject({ id: requestId, note: null });

    const logs = await context.deps.db
      .select()
      .from(playLog)
      .where(eq(playLog.sessionId, session.id));
    expect(logs.map((row) => row.title).sort()).toEqual(["Levitating", "Sensiz"]);
    const levitating = logs.find((row) => row.title === "Levitating");
    expect(levitating).toMatchObject({ bpm: 103, key: "6A", source: "rekordbox" });

    const published = context.publisher.publish.mock.calls
      .filter((call) => call[0] === venue.id)
      .map((call) => (call[1] as { type: string }).type);
    expect(published[0]).toBe("session.changed");
    expect(published).toContain("nowplaying.updated");
    expect(published.filter((type) => type === "request.upserted")).toHaveLength(5);

    const ended = await api.ok("djSessionEnd", { ...dj, params: { sessionId: session.id } });
    expect(ended.endedAt).not.toBeNull();
    expect(ended.playedTotal).toBe(2);
  });

  it("joins with a table token, counts scans and blocks banned devices", async () => {
    const fixture = await createFixture(context);
    const { api, venue, owner } = fixture;
    const code = await api.ok("adminQrCreate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { label: "Table 7" },
    });
    const first = await fixture.guest("device-tablecheck-1", code.token);
    expect(first.tableLabel).toBe("Table 7");
    const unknownToken = await fixture.guest("device-tablecheck-2", "nope-nope");
    expect(unknownToken.tableLabel).toBeNull();
    await fixture.guest("device-tablecheck-1", code.token);
    const [row] = await context.deps.db.select().from(qrCodes).where(eq(qrCodes.id, code.id));
    expect(row?.scans).toBe(2);

    const request = await api.ok("requestCreate", {
      token: first.token,
      params: { slug: venue.slug },
      body: { trackId: "deezer:102", tableToken: code.token },
    });
    expect(request.request.tableLabel).toBe("Table 7");

    await api.ok("adminDeviceBan", {
      token: owner.accessToken,
      params: { venueId: venue.id, deviceId: "device-tablecheck-2" },
    });
    const banned = await api.call("guestJoin", {
      params: { slug: venue.slug },
      body: { deviceId: "device-tablecheck-2" },
    });
    expect(banned.status).toBe(403);
    expect(errorCode(banned)).toBe("forbidden");
    const missing = await api.call("guestJoin", { params: { slug: "no-such-venue" }, body: {} });
    expect(missing.status).toBe(404);
  });

  it("returns suggestions with venue trends first and catalog fallbacks", async () => {
    const fixture = await createFixture(context);
    const { api, venue } = fixture;
    const empty = await api.ok("suggestions", { params: { slug: venue.slug } });
    expect(empty.sections.map((section) => section.id)).toEqual([
      "trending_here",
      "dj_picks",
      "uz_hits",
      "ru_pop",
      "club",
      "slow",
      "birthday",
    ]);
    for (const section of empty.sections) expect(section.tracks.length).toBeGreaterThan(0);

    const guest = await fixture.guest();
    await api.ok("requestCreate", {
      token: guest.token,
      params: { slug: venue.slug },
      body: { trackId: "deezer:106" },
    });
    const trending = await api.ok("suggestions", { params: { slug: venue.slug } });
    expect(trending.sections[0]?.tracks[0]?.id).toBe("deezer:106");
    expect(sampleTracks.length).toBeGreaterThan(0);
  });

  it("validates search input and the guest token", async () => {
    const fixture = await createFixture(context);
    const bad = await fixture.api.call("catalogSearch", { query: { q: "" } });
    expect(bad.status).toBe(400);
    const anonymous = await fixture.api.call("requestCreate", {
      params: { slug: fixture.venue.slug },
      body: { trackId: "deezer:101" },
    });
    expect(anonymous.status).toBe(401);
    const other = await createFixture(context);
    const foreign = await other.guest();
    const wrongVenue = await fixture.api.call("requestCreate", {
      token: foreign.token,
      params: { slug: fixture.venue.slug },
      body: { trackId: "deezer:101" },
    });
    expect(wrongVenue.status).toBe(403);
  });
});
