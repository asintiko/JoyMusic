import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import {
  djSessions,
  guestDevices,
  playLog,
  qrCodes,
  requests,
  tracks,
  venues,
} from "../src/db/schema";
import { newId } from "../src/lib/ids";
import { errorCode } from "./helpers/api";
import { createTestContext, uniq, type TestContext } from "./helpers/context";
import { apiOf, createVenue, registerOwner, startSession, type Actor } from "./helpers/factories";

const windowQuery = { from: "2026-09-01T00:00:00Z", to: "2026-09-30T00:00:00Z" };

describe("analytics overview", () => {
  let context: TestContext;
  let owner: Actor;
  let rival: Actor;
  let tashkentVenueId: string;
  let newYorkVenueId: string;
  let rivalVenueId: string;

  async function addRequest(input: {
    venueId: string;
    sessionId: string;
    title: string;
    artist: string;
    createdAt: string;
    deviceId: string;
    votes?: number;
    status?: (typeof requests.$inferInsert)["status"];
    tableLabel?: string | null;
    trackId?: string | null;
    artworkUrl?: string | null;
  }) {
    await context.deps.db.insert(requests).values({
      id: newId("req"),
      sessionId: input.sessionId,
      venueId: input.venueId,
      title: input.title,
      artist: input.artist,
      deviceId: input.deviceId,
      votes: input.votes ?? 1,
      status: input.status ?? "pending",
      tableLabel: input.tableLabel ?? null,
      trackId: input.trackId ?? null,
      artworkUrl: input.artworkUrl ?? null,
      createdAt: new Date(input.createdAt),
      updatedAt: new Date(input.createdAt),
    });
  }

  async function addPlay(venueId: string, sessionId: string, title: string, startedAt: string) {
    await context.deps.db.insert(playLog).values({
      id: newId("pl"),
      venueId,
      sessionId,
      title,
      artist: "Artist",
      startedAt: new Date(startedAt),
    });
  }

  async function addDevice(venueId: string, id: string, lastSeenAt: string) {
    await context.deps.db.insert(guestDevices).values({
      id,
      venueId,
      firstSeenAt: new Date(lastSeenAt),
      lastSeenAt: new Date(lastSeenAt),
    });
  }

  async function addQr(venueId: string, label: string, scans: number) {
    await context.deps.db
      .insert(qrCodes)
      .values({ id: newId("qr"), venueId, label, token: newId("tok"), scans });
  }

  beforeAll(async () => {
    context = await createTestContext();
    owner = await registerOwner(context);
    rival = await registerOwner(context);
    const tashkent = await createVenue(context, owner, { name: "Tashkent" });
    tashkentVenueId = tashkent.id;
    const newYork = await createVenue(context, owner, { name: "New York" });
    newYorkVenueId = newYork.id;
    await context.deps.db
      .update(venues)
      .set({ timezone: "America/New_York" })
      .where(eq(venues.id, newYorkVenueId));
    rivalVenueId = (await createVenue(context, rival)).id;

    const s1 = await startSession(context, tashkentVenueId, owner.userId, new Date("2026-09-20T14:00:00Z"));
    await context.deps.db
      .update(djSessions)
      .set({ endedAt: new Date("2026-09-20T18:00:00Z") })
      .where(eq(djSessions.id, s1));
    const s2 = await startSession(context, tashkentVenueId, owner.userId, new Date("2026-09-21T09:00:00Z"));
    const s3 = await startSession(context, newYorkVenueId, owner.userId, new Date("2026-09-21T11:00:00Z"));
    const rivalSession = await startSession(context, rivalVenueId, rival.userId, new Date("2026-09-21T09:00:00Z"));
    await startSession(
      context,
      (await createVenue(context, owner, { name: "Old" })).id,
      owner.userId,
      new Date("2026-05-01T09:00:00Z"),
    );

    const trackSourceId = uniq("analytics-c");
    const trackId = `deezer:${trackSourceId}`;
    await context.deps.db.insert(tracks).values({
      id: trackId,
      source: "deezer",
      sourceId: trackSourceId,
      title: "Song C",
      artist: "Artist C",
    });

    await addRequest({
      venueId: tashkentVenueId,
      sessionId: s1,
      title: "Song A",
      artist: "Artist A",
      createdAt: "2026-09-20T15:30:00Z",
      deviceId: "d1",
      votes: 3,
      status: "played",
      tableLabel: "Table 1",
      artworkUrl: "https://img.test/a.jpg",
    });
    await addRequest({
      venueId: tashkentVenueId,
      sessionId: s2,
      title: "song a",
      artist: "artist a",
      createdAt: "2026-09-20T19:10:00Z",
      deviceId: "d2",
      status: "accepted",
      tableLabel: "Table 1",
    });
    await addRequest({
      venueId: tashkentVenueId,
      sessionId: s2,
      title: "Song B",
      artist: "Artist B",
      createdAt: "2026-09-21T10:00:00Z",
      deviceId: "d1",
      status: "declined",
      tableLabel: "Bar",
    });
    await addRequest({
      venueId: tashkentVenueId,
      sessionId: s2,
      title: "Song C",
      artist: "Artist C",
      createdAt: "2026-09-21T11:00:00Z",
      deviceId: "d3",
      votes: 2,
      trackId,
    });
    await addRequest({
      venueId: newYorkVenueId,
      sessionId: s3,
      title: "Song A",
      artist: "Artist A",
      createdAt: "2026-09-21T12:00:00Z",
      deviceId: "d4",
      tableLabel: "Bar",
    });
    await addRequest({
      venueId: tashkentVenueId,
      sessionId: s2,
      title: "Ancient",
      artist: "Artist Z",
      createdAt: "2026-08-15T10:00:00Z",
      deviceId: "d5",
    });
    await addRequest({
      venueId: rivalVenueId,
      sessionId: rivalSession,
      title: "Rival Hit",
      artist: "Rival",
      createdAt: "2026-09-21T10:00:00Z",
      deviceId: "r1",
      tableLabel: "Table 1",
    });

    await addPlay(tashkentVenueId, s1, "P1", "2026-09-20T15:00:00Z");
    await addPlay(tashkentVenueId, s1, "P2", "2026-09-20T16:00:00Z");
    await addPlay(tashkentVenueId, s2, "P3", "2026-09-21T10:00:00Z");
    await addPlay(tashkentVenueId, s2, "P4", "2026-07-01T10:00:00Z");
    await addPlay(newYorkVenueId, s3, "P5", "2026-09-21T12:30:00Z");
    await addPlay(rivalVenueId, rivalSession, "P6", "2026-09-21T12:30:00Z");

    await addDevice(tashkentVenueId, "d1", "2026-09-21T10:00:00Z");
    await addDevice(tashkentVenueId, "d2", "2026-09-20T19:10:00Z");
    await addDevice(tashkentVenueId, "d3", "2026-09-21T11:00:00Z");
    await addDevice(tashkentVenueId, "d9", "2026-09-21T13:00:00Z");
    await addDevice(tashkentVenueId, "old", "2026-06-01T13:00:00Z");
    await addDevice(newYorkVenueId, "d4", "2026-09-21T12:00:00Z");
    await addDevice(rivalVenueId, "r1", "2026-09-21T10:00:00Z");

    await addQr(tashkentVenueId, "Table 1", 5);
    await addQr(tashkentVenueId, "Bar", 2);
    await addQr(newYorkVenueId, "Bar", 3);
    await addQr(rivalVenueId, "Table 1", 99);
  });
  afterAll(async () => {
    await context.close();
  });
  const api = () => apiOf(context);

  it("aggregates totals across all venues of the organization", async () => {
    const overview = await api().ok("adminAnalytics", {
      token: owner.accessToken,
      query: windowQuery,
    });
    expect(overview.totals).toEqual({
      sessions: 3,
      requests: 5,
      uniqueGuests: 5,
      played: 4,
      declineRate: 0.2,
      scans: 10,
    });
  });

  it("ranks top tracks by demand and merges spelling variants", async () => {
    const overview = await api().ok("adminAnalytics", {
      token: owner.accessToken,
      query: windowQuery,
    });
    expect(overview.topTracks).toEqual([
      { title: "Song A", artist: "Artist A", artworkUrl: "https://img.test/a.jpg", count: 5 },
      { title: "Song C", artist: "Artist C", artworkUrl: null, count: 2 },
      { title: "Song B", artist: "Artist B", artworkUrl: null, count: 1 },
    ]);
  });

  it("buckets hours in each venue's own timezone", async () => {
    const overview = await api().ok("adminAnalytics", {
      token: owner.accessToken,
      query: windowQuery,
    });
    expect(overview.byHour).toHaveLength(24);
    const busy = overview.byHour.filter((entry) => entry.requests > 0);
    expect(busy).toEqual([
      { hour: 0, requests: 1 },
      { hour: 8, requests: 1 },
      { hour: 15, requests: 1 },
      { hour: 16, requests: 1 },
      { hour: 20, requests: 1 },
    ]);
  });

  it("builds a dense daily series limited to the last 30 days with local dates", async () => {
    const overview = await api().ok("adminAnalytics", {
      token: owner.accessToken,
      query: { from: "2026-06-01T00:00:00Z", to: windowQuery.to },
    });
    expect(overview.byDay).toHaveLength(30);
    expect(overview.byDay[0]?.date).toBe("2026-09-01");
    expect(overview.byDay.at(-1)?.date).toBe("2026-09-30");
    const active = overview.byDay.filter((entry) => entry.requests > 0);
    expect(active).toEqual([
      { date: "2026-09-20", requests: 1, guests: 1 },
      { date: "2026-09-21", requests: 4, guests: 4 },
    ]);
    expect(overview.totals.requests).toBe(6);
  });

  it("joins request counts with qr scans per table label", async () => {
    const overview = await api().ok("adminAnalytics", {
      token: owner.accessToken,
      query: windowQuery,
    });
    expect(overview.byTable).toEqual([
      { label: "Bar", requests: 2, scans: 5 },
      { label: "Table 1", requests: 2, scans: 5 },
    ]);
  });

  it("filters by venue", async () => {
    const overview = await api().ok("adminAnalytics", {
      token: owner.accessToken,
      query: { ...windowQuery, venueId: tashkentVenueId },
    });
    expect(overview.totals).toEqual({
      sessions: 2,
      requests: 4,
      uniqueGuests: 4,
      played: 3,
      declineRate: 0.25,
      scans: 7,
    });
    expect(overview.topTracks.map((track) => track.count)).toEqual([4, 2, 1]);
    expect(overview.byTable).toEqual([
      { label: "Table 1", requests: 2, scans: 5 },
      { label: "Bar", requests: 1, scans: 2 },
    ]);
    const newYork = await api().ok("adminAnalytics", {
      token: owner.accessToken,
      query: { ...windowQuery, venueId: newYorkVenueId },
    });
    expect(newYork.byHour.find((entry) => entry.requests > 0)).toEqual({ hour: 8, requests: 1 });
  });

  it("respects the from and to filters", async () => {
    const overview = await api().ok("adminAnalytics", {
      token: owner.accessToken,
      query: { from: "2026-09-21T00:00:00Z", to: "2026-09-21T23:59:59Z" },
    });
    expect(overview.totals.requests).toBe(3);
    expect(overview.totals.played).toBe(2);
    expect(overview.totals.sessions).toBe(2);
  });

  it("uses the last 30 days by default", async () => {
    const actor = await registerOwner(context);
    const venue = await createVenue(context, actor);
    const session = await startSession(context, venue.id, actor.userId);
    await addRequest({
      venueId: venue.id,
      sessionId: session,
      title: "Fresh",
      artist: "Now",
      createdAt: new Date(Date.now() - 3600_000).toISOString(),
      deviceId: "fresh-device",
    });
    await addRequest({
      venueId: venue.id,
      sessionId: session,
      title: "Stale",
      artist: "Then",
      createdAt: new Date(Date.now() - 40 * 24 * 3600_000).toISOString(),
      deviceId: "stale-device",
    });
    const overview = await api().ok("adminAnalytics", { token: actor.accessToken });
    expect(overview.totals.requests).toBe(1);
    expect(overview.byDay).toHaveLength(30);
    expect(overview.byDay.reduce((sum, day) => sum + day.requests, 0)).toBe(1);
  });

  it("never mixes in another organization's data", async () => {
    const overview = await api().ok("adminAnalytics", {
      token: rival.accessToken,
      query: windowQuery,
    });
    expect(overview.totals).toEqual({
      sessions: 1,
      requests: 1,
      uniqueGuests: 1,
      played: 1,
      declineRate: 0,
      scans: 99,
    });
    expect(overview.topTracks.map((track) => track.title)).toEqual(["Rival Hit"]);
  });

  it("hides other organizations' venues", async () => {
    const response = await api().call("adminAnalytics", {
      token: rival.accessToken,
      query: { venueId: tashkentVenueId },
    });
    expect(response.status).toBe(404);
    expect(errorCode(response)).toBe("not_found");
  });

  it("excludes deleted venues", async () => {
    const actor = await registerOwner(context);
    const venue = await createVenue(context, actor);
    const session = await startSession(context, venue.id, actor.userId);
    await addRequest({
      venueId: venue.id,
      sessionId: session,
      title: "Gone",
      artist: "Soon",
      createdAt: new Date().toISOString(),
      deviceId: "gone-device",
    });
    await api().ok("adminVenueDelete", { token: actor.accessToken, params: { venueId: venue.id } });
    const overview = await api().ok("adminAnalytics", { token: actor.accessToken });
    expect(overview.totals.requests).toBe(0);
  });

  it("returns a well formed empty overview for an organization without venues", async () => {
    const actor = await registerOwner(context);
    const overview = await api().ok("adminAnalytics", { token: actor.accessToken });
    expect(overview.totals).toEqual({
      sessions: 0,
      requests: 0,
      uniqueGuests: 0,
      played: 0,
      declineRate: 0,
      scans: 0,
    });
    expect(overview.byHour).toHaveLength(24);
    expect(overview.byDay).toHaveLength(30);
    expect(overview.topTracks).toEqual([]);
    expect(overview.byTable).toEqual([]);
  });

  it("validates the range", async () => {
    const inverted = await api().call("adminAnalytics", {
      token: owner.accessToken,
      query: { from: "2026-09-30T00:00:00Z", to: "2026-09-01T00:00:00Z" },
    });
    expect(inverted.status).toBe(400);
    expect(errorCode(inverted)).toBe("validation_failed");
    const malformed = await api().call("adminAnalytics", {
      token: owner.accessToken,
      query: { from: "yesterday" },
    });
    expect(malformed.status).toBe(400);
  });
});
