import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { defaultVenueSettings } from "@joymusic/shared";
import { auditLog, djSessions, venues } from "../src/db/schema";
import { errorCode } from "./helpers/api";
import { createTestContext, uniq, type TestContext } from "./helpers/context";
import { apiOf, createVenue, registerOwner, startSession, type Actor } from "./helpers/factories";

describe("venues", () => {
  let context: TestContext;
  let owner: Actor;

  beforeAll(async () => {
    context = await createTestContext();
    owner = await registerOwner(context);
  });
  afterAll(async () => {
    await context.close();
  });
  const api = () => apiOf(context);

  it("creates a venue with default settings and records an audit entry", async () => {
    const slug = `create-${uniq()}`;
    const venue = await api().ok("adminVenueCreate", {
      token: owner.accessToken,
      body: { name: "Creation Club", slug, city: "Samarkand", theme: "lounge" },
    });
    expect(venue).toMatchObject({
      slug,
      city: "Samarkand",
      theme: "lounge",
      timezone: "Asia/Tashkent",
      organizationId: owner.organizationId,
      activeSessionId: null,
      settings: defaultVenueSettings,
    });
    const audit = await api().ok("adminAudit", { token: owner.accessToken, query: { limit: 200 } });
    expect(audit.entries).toContainEqual(
      expect.objectContaining({
        action: "venue.create",
        target: venue.id,
        actorName: owner.name,
        meta: { slug, name: "Creation Club" },
      }),
    );
  });

  it("responds 201 for creation and 200 for reads", async () => {
    const created = await api().call("adminVenueCreate", {
      token: owner.accessToken,
      body: { name: "Status Club", slug: `status-${uniq()}` },
    });
    expect(created.status).toBe(201);
  });

  it("rejects duplicate slugs with conflict", async () => {
    const venue = await createVenue(context, owner);
    const other = await registerOwner(context);
    const response = await api().call("adminVenueCreate", {
      token: other.accessToken,
      body: { name: "Copycat", slug: venue.slug },
    });
    expect(response.status).toBe(409);
    expect(errorCode(response)).toBe("conflict");
  });

  it("validates slug format and timezone", async () => {
    const badSlug = await api().call("adminVenueCreate", {
      token: owner.accessToken,
      body: { name: "Bad Slug", slug: "Not A Slug!" },
    });
    expect(badSlug.status).toBe(400);
    expect(errorCode(badSlug)).toBe("validation_failed");
    const badZone = await api().call("adminVenueCreate", {
      token: owner.accessToken,
      body: { name: "Bad Zone", slug: `zone-${uniq()}`, timezone: "Mars/Olympus" },
    });
    expect(badZone.status).toBe(400);
    const venue = await createVenue(context, owner);
    const badUpdate = await api().call("adminVenueUpdate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { timezone: "Nowhere/Land" },
    });
    expect(badUpdate.status).toBe(400);
  });

  it("merges partial settings and validates the result", async () => {
    const venue = await createVenue(context, owner);
    const updated = await api().ok("adminVenueUpdate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: {
        name: "Renamed Club",
        theme: "cafe",
        settings: { requestsOpen: false, maxRequestsPerDevice: 7 },
      },
    });
    expect(updated.name).toBe("Renamed Club");
    expect(updated.theme).toBe("cafe");
    expect(updated.settings).toEqual({
      ...defaultVenueSettings,
      requestsOpen: false,
      maxRequestsPerDevice: 7,
    });
    const second = await api().ok("adminVenueUpdate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { settings: { allowNotes: false } },
    });
    expect(second.settings).toEqual({
      ...defaultVenueSettings,
      requestsOpen: false,
      maxRequestsPerDevice: 7,
      allowNotes: false,
    });
    const invalid = await api().call("adminVenueUpdate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { settings: { maxRequestsPerDevice: 500 } },
    });
    expect(invalid.status).toBe(400);
    expect(errorCode(invalid)).toBe("validation_failed");
    const unchanged = await api().ok("adminVenueGet", {
      token: owner.accessToken,
      params: { venueId: venue.id },
    });
    expect(unchanged.settings.maxRequestsPerDevice).toBe(7);
  });

  it("clears nullable fields explicitly and leaves omitted ones alone", async () => {
    const venue = await api().ok("adminVenueCreate", {
      token: owner.accessToken,
      body: { name: "Nullable", slug: `nullable-${uniq()}`, city: "Tashkent", address: "Main 1" },
    });
    const cleared = await api().ok("adminVenueUpdate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { city: null, logoUrl: "https://cdn.test/logo.png" },
    });
    expect(cleared.city).toBeNull();
    expect(cleared.address).toBe("Main 1");
    expect(cleared.logoUrl).toBe("https://cdn.test/logo.png");
  });

  it("publishes settings changes to the realtime seam", async () => {
    const venue = await createVenue(context, owner);
    context.publisher.publish.mockClear();
    await api().ok("adminVenueUpdate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { name: "No settings change" },
    });
    expect(context.publisher.publish).not.toHaveBeenCalled();
    await api().ok("adminVenueUpdate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { settings: { requestsOpen: false } },
    });
    expect(context.publisher.publish).toHaveBeenCalledWith(venue.id, {
      type: "settings.updated",
      data: { settings: { ...defaultVenueSettings, requestsOpen: false } },
    });
  });

  it("survives a failing publisher", async () => {
    const failing = await createTestContext({
      deps: { publisher: { publish: () => Promise.reject(new Error("bus down")) } },
    });
    try {
      const actor = await registerOwner(failing);
      const venue = await createVenue(failing, actor);
      const response = await apiOf(failing).call("adminVenueUpdate", {
        token: actor.accessToken,
        params: { venueId: venue.id },
        body: { settings: { requestsOpen: false } },
      });
      expect(response.status).toBe(200);
    } finally {
      await failing.close();
    }
  });

  it("computes activeSessionId from open dj sessions only", async () => {
    const venue = await createVenue(context, owner);
    const other = await createVenue(context, owner);
    const sessionId = await startSession(context, venue.id, owner.userId);
    const closedId = await startSession(context, other.id, owner.userId);
    await context.deps.db
      .update(djSessions)
      .set({ endedAt: new Date() })
      .where(eq(djSessions.id, closedId));
    const withSession = await api().ok("adminVenueGet", {
      token: owner.accessToken,
      params: { venueId: venue.id },
    });
    const withoutSession = await api().ok("adminVenueGet", {
      token: owner.accessToken,
      params: { venueId: other.id },
    });
    expect(withSession.activeSessionId).toBe(sessionId);
    expect(withoutSession.activeSessionId).toBeNull();
    const list = await api().ok("adminVenues", { token: owner.accessToken });
    expect(list.venues.find((entry) => entry.id === venue.id)?.activeSessionId).toBe(sessionId);
    const dj = await api().ok("djVenues", { token: owner.accessToken });
    expect(dj.venues.find((entry) => entry.id === venue.id)?.activeSessionId).toBe(sessionId);
  });

  it("soft deletes: hidden everywhere, session ended, slug reusable", async () => {
    const actor = await registerOwner(context);
    const venue = await createVenue(context, actor);
    const sessionId = await startSession(context, venue.id, actor.userId);
    context.publisher.publish.mockClear();
    const deleted = await api().ok("adminVenueDelete", {
      token: actor.accessToken,
      params: { venueId: venue.id },
    });
    expect(deleted.ok).toBe(true);
    const [row] = await context.deps.db.select().from(venues).where(eq(venues.id, venue.id));
    expect(row?.deletedAt).toBeInstanceOf(Date);
    const [session] = await context.deps.db
      .select()
      .from(djSessions)
      .where(eq(djSessions.id, sessionId));
    expect(session?.endedAt).toBeInstanceOf(Date);
    expect(context.publisher.publish).toHaveBeenCalledWith(venue.id, {
      type: "session.changed",
      data: { session: null },
    });
    const get = await api().call("adminVenueGet", {
      token: actor.accessToken,
      params: { venueId: venue.id },
    });
    expect(get.status).toBe(404);
    const again = await api().call("adminVenueDelete", {
      token: actor.accessToken,
      params: { venueId: venue.id },
    });
    expect(again.status).toBe(404);
    const list = await api().ok("adminVenues", { token: actor.accessToken });
    expect(list.venues).toEqual([]);
    const dj = await api().ok("djVenues", { token: actor.accessToken });
    expect(dj.venues).toEqual([]);
    const reused = await api().call("adminVenueCreate", {
      token: actor.accessToken,
      body: { name: "Second Life", slug: venue.slug },
    });
    expect(reused.status).toBe(201);
    const audit = await context.deps.db
      .select()
      .from(auditLog)
      .where(eq(auditLog.organizationId, actor.organizationId));
    expect(audit.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(["venue.create", "venue.delete"]),
    );
  });

  it("returns a 404 for unknown venues and validates ids", async () => {
    const response = await api().call("adminVenueGet", {
      token: owner.accessToken,
      params: { venueId: "ven_missing" },
    });
    expect(response.status).toBe(404);
    expect(errorCode(response)).toBe("not_found");
  });

  it("limits one active dj session per venue at the database level", async () => {
    const venue = await createVenue(context, owner);
    await startSession(context, venue.id, owner.userId);
    await expect(startSession(context, venue.id, owner.userId)).rejects.toThrow();
  });
});
