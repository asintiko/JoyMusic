import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { requests } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { errorCode } from "./helpers/api";
import type { TestContext } from "./helpers/context";
import { createFixture, newContext, type Fixture } from "./helpers/flow";
import { findProfanity } from "../src/lib/profanity";

describe("request rules", () => {
  let context: TestContext;
  beforeAll(async () => {
    context = await newContext();
  });
  afterAll(async () => {
    await context.close();
  });

  async function create(fixture: Fixture, token: string, body: Record<string, unknown>) {
    return fixture.api.call("requestCreate", {
      token,
      params: { slug: fixture.venue.slug },
      body: body as never,
    });
  }

  it("rejects requests without an active session", async () => {
    const fixture = await createFixture(context, { startSession: false });
    const guest = await fixture.guest();
    const response = await create(fixture, guest.token, { trackId: "deezer:101" });
    expect(response.status).toBe(409);
    expect(errorCode(response)).toBe("no_active_session");
  });

  it("rejects requests while requests are closed", async () => {
    const fixture = await createFixture(context, { settings: { requestsOpen: false } });
    const guest = await fixture.guest();
    const response = await create(fixture, guest.token, { trackId: "deezer:101" });
    expect(response.status).toBe(403);
    expect(errorCode(response)).toBe("requests_closed");
  });

  it("limits requests per device within the window and reports retry-after", async () => {
    const fixture = await createFixture(context, {
      settings: { maxRequestsPerDevice: 2, windowMinutes: 30 },
    });
    const guest = await fixture.guest();
    const other = await fixture.guest();
    expect((await create(fixture, guest.token, { trackId: "deezer:101" })).status).toBe(201);
    expect((await create(fixture, guest.token, { trackId: "deezer:102" })).status).toBe(201);
    const blocked = await create(fixture, guest.token, { trackId: "deezer:103" });
    expect(blocked.status).toBe(429);
    expect(errorCode(blocked)).toBe("request_limit_reached");
    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect((await create(fixture, other.token, { trackId: "deezer:103" })).status).toBe(201);

    const merge = await create(fixture, guest.token, { trackId: "deezer:103" });
    expect(merge.status).toBe(200);
    expect((merge.body as { merged: boolean }).merged).toBe(true);
    const votes = await create(fixture, other.token, { trackId: "deezer:101" });
    expect(votes.status).toBe(200);
    expect((votes.body as { merged: boolean }).merged).toBe(true);

    await context.deps.db
      .update(requests)
      .set({ createdAt: new Date(Date.now() - 31 * 60_000) })
      .where(eq(requests.venueId, fixture.venue.id));
    const again = await create(fixture, guest.token, { trackId: "deezer:104" });
    expect(again.status).toBe(201);
  });

  it("merges the same song by normalized artist and title, ignoring duplicates outside the window", async () => {
    const fixture = await createFixture(context, { settings: { duplicateWindowMinutes: 10 } });
    const one = await fixture.guest();
    const two = await fixture.guest();
    const first = await create(fixture, one.token, {
      freeText: { artist: "Adele", title: "Hello" },
    });
    expect(first.status).toBe(201);
    const second = await create(fixture, two.token, {
      freeText: { artist: "  ADELE ", title: "hello!" },
    });
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ merged: true, request: { votes: 2 } });
    await context.deps.db
      .update(requests)
      .set({ createdAt: new Date(Date.now() - 11 * 60_000) })
      .where(eq(requests.venueId, fixture.venue.id));
    const three = await fixture.guest();
    const late = await create(fixture, three.token, {
      freeText: { artist: "Adele", title: "Hello" },
    });
    expect(late.status).toBe(201);
    expect((late.body as { merged: boolean }).merged).toBe(false);
  });

  it("gates free text and notes by venue settings", async () => {
    const fixture = await createFixture(context, {
      settings: { allowFreeText: false, allowNotes: false },
    });
    const guest = await fixture.guest();
    const freeText = await create(fixture, guest.token, { freeText: { artist: "A", title: "B" } });
    expect(errorCode(freeText)).toBe("free_text_disabled");
    const note = await create(fixture, guest.token, { trackId: "deezer:101", note: "hi" });
    expect(errorCode(note)).toBe("notes_disabled");
    const dedication = await create(fixture, guest.token, {
      trackId: "deezer:101",
      dedicatedTo: "Ali",
    });
    expect(errorCode(dedication)).toBe("notes_disabled");
    expect((await create(fixture, guest.token, { trackId: "deezer:101" })).status).toBe(201);
  });

  it("requires a track, a known track id and a valid body", async () => {
    const fixture = await createFixture(context);
    const guest = await fixture.guest();
    expect((await create(fixture, guest.token, {})).status).toBe(400);
    expect((await create(fixture, guest.token, { trackId: "deezer:999999" })).status).toBe(404);
  });

  it("blocks profanity in free text, notes and dedications with the built-in and organization lists", async () => {
    const fixture = await createFixture(context);
    const guest = await fixture.guest();
    const blocked = async (body: Record<string, unknown>) => {
      const response = await create(fixture, guest.token, body);
      return { status: response.status, code: errorCode(response) };
    };
    expect(await blocked({ freeText: { artist: "Fuck", title: "Song" } })).toEqual({
      status: 422,
      code: "content_blocked",
    });
    expect(await blocked({ trackId: "deezer:101", note: "you are a ХУЙ" })).toMatchObject({
      code: "content_blocked",
    });
    expect(await blocked({ trackId: "deezer:101", dedicatedTo: "s.h.i.t" })).toMatchObject({
      code: "content_blocked",
    });
    await fixture.api.ok("adminBannedWordAdd", {
      token: fixture.owner.accessToken,
      body: { word: "Zebra" },
    });
    expect(await blocked({ trackId: "deezer:101", note: "zzzebra party" })).toMatchObject({
      code: "content_blocked",
    });
    expect(
      (await create(fixture, guest.token, { trackId: "deezer:101", note: "classic" })).status,
    ).toBe(201);
  });

  it("detects obfuscated profanity and avoids common false positives", () => {
    const hits = [
      "FUCK",
      "fuuuuck",
      "fuсk",
      "f u c k",
      "sh1t",
      "хуй",
      "xuy",
      "Ху-й",
      "пиздец",
      "pizdets",
      "сууука",
      "blyat",
      "бляяяять",
      "jalab",
      "Жалаб",
      "onangni",
      "ONANGNI sikaman",
    ];
    for (const text of hits) expect(findProfanity(text), text).not.toBeNull();
    const clean = [
      "Levitating",
      "Sensiz",
      "Assassin's Creed",
      "Tsukasa",
      "Shakira",
      "Scunthorpe",
      "Class of 2024",
      "Bass Boosted",
      "Yulduz Usmonova",
    ];
    const misses = clean.filter((text) => findProfanity(text) !== null);
    expect(misses).toEqual([]);
  });

  it("blocks banned devices from requesting and voting", async () => {
    const fixture = await createFixture(context);
    const owner = await fixture.guest();
    const banned = await fixture.guest();
    const created = await create(fixture, owner.token, { trackId: "deezer:101" });
    const requestId = (created.body as { request: { id: string } }).request.id;
    await fixture.api.ok("adminDeviceBan", {
      token: fixture.owner.accessToken,
      params: { venueId: fixture.venue.id, deviceId: banned.deviceId },
    });
    expect((await create(fixture, banned.token, { trackId: "deezer:102" })).status).toBe(403);
    const vote = await fixture.api.call("requestVote", {
      token: banned.token,
      params: { id: requestId },
    });
    expect(vote.status).toBe(403);
  });

  it("votes once per device, only while the request is open", async () => {
    const fixture = await createFixture(context);
    const owner = await fixture.guest();
    const voter = await fixture.guest();
    const created = await create(fixture, owner.token, { trackId: "deezer:101", note: "secret" });
    const requestId = (created.body as { request: { id: string } }).request.id;
    const voted = await fixture.api.ok("requestVote", {
      token: voter.token,
      params: { id: requestId },
    });
    expect(voted).toMatchObject({ votes: 2, mine: true, note: null });
    const twice = await fixture.api.call("requestVote", {
      token: voter.token,
      params: { id: requestId },
    });
    expect(twice.status).toBe(409);
    await fixture.api.ok("djRequestDecline", {
      token: fixture.owner.accessToken,
      params: { id: requestId },
      body: { reason: "not now" },
    });
    const late = await fixture.api.call("requestVote", {
      token: (await fixture.guest()).token,
      params: { id: requestId },
    });
    expect(late.status).toBe(409);
    const missing = await fixture.api.call("requestVote", {
      token: voter.token,
      params: { id: "req_missing" },
    });
    expect(missing.status).toBe(404);
  });

  it("rate limits catalog search per address", async () => {
    const limited = await newContext({ env: { RATE_LIMIT_SEARCH_MAX: "3" } });
    try {
      const statuses: number[] = [];
      for (let index = 0; index < 5; index += 1) {
        const response = await limited.app.inject({
          method: "GET",
          url: "/v1/catalog/search?q=adele",
        });
        statuses.push(response.statusCode);
      }
      expect(statuses).toEqual([200, 200, 200, 429, 429]);
    } finally {
      await limited.close();
    }
  });
});
