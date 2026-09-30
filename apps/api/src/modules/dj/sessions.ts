import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { routes } from "@joymusic/shared";
import { djSessions, venues } from "../../db/schema";
import { conflict, notFound } from "../../errors";
import { registerRoute } from "../../http/register-route";
import { newId } from "../../lib/ids";
import { lockVenue } from "../../lib/venue-lock";
import { publishEvents } from "../events";
import { endSession, findIdleSessions } from "../sessions/lifecycle";
import { loadSessionSummary } from "../sessions/summary";
import { mergeVenueSettings, parseVenueSettings } from "../venues/service";
import { buildVenueState, findActiveSession } from "../venues/state";
import type { VenueEventInput } from "../../realtime/publisher";
import { assertSessionActive, authorizeSession, authorizeVenue } from "./access";

export const djSessionRoutes: FastifyPluginAsync = async (app) => {
  const deps = app.deps;
  const { db, config } = deps;

  registerRoute(app, routes.djSessionStart, async ({ params, user, reply }) => {
    const venue = await authorizeVenue(deps, user, params.venueId);
    const outcome = await db.transaction(async (tx) => {
      await lockVenue(tx, venue.id);
      const now = new Date();
      const events: VenueEventInput[] = [];
      const idle = await findIdleSessions(
        tx,
        new Date(now.getTime() - config.jobs.sessionIdleMs),
        venue.id,
      );
      for (const stale of idle) events.push(...(await endSession(tx, stale, now)));
      const active = await findActiveSession(tx, venue.id);
      if (active) {
        if (active.session.djUserId !== user.id) {
          throw conflict("Another DJ already has an active session at this venue");
        }
        return { sessionId: active.session.id, created: false, events };
      }
      const sessionId = newId("ses");
      await tx
        .insert(djSessions)
        .values({ id: sessionId, venueId: venue.id, djUserId: user.id, startedAt: now });
      events.push({
        type: "session.changed",
        data: { session: { id: sessionId, djName: user.name, startedAt: now.toISOString() } },
      });
      return { sessionId, created: true, events };
    });
    await publishEvents(deps.publisher, app.log, venue.id, outcome.events);
    const summary = await loadSessionSummary(db, outcome.sessionId);
    if (!summary) throw notFound("Session not found");
    if (outcome.created) reply.code(201);
    return summary;
  });

  registerRoute(app, routes.djSessionEnd, async ({ params, user }) => {
    const { session } = await authorizeSession(deps, user, params.sessionId);
    if (!session.endedAt) {
      const events = await db.transaction(async (tx) => {
        await lockVenue(tx, session.venueId);
        const [fresh] = await tx
          .select()
          .from(djSessions)
          .where(eq(djSessions.id, session.id))
          .limit(1);
        if (!fresh || fresh.endedAt) return [];
        return endSession(tx, fresh, new Date());
      });
      await publishEvents(deps.publisher, app.log, session.venueId, events);
    }
    const summary = await loadSessionSummary(db, session.id);
    if (!summary) throw notFound("Session not found");
    return summary;
  });

  registerRoute(app, routes.djSessionState, async ({ params, user }) => {
    const { venue } = await authorizeSession(deps, user, params.sessionId);
    return buildVenueState(deps, venue, { audience: "dj" });
  });

  registerRoute(app, routes.djSessionSettings, async ({ params, body, user }) => {
    const { session, venue } = await authorizeSession(deps, user, params.sessionId);
    assertSessionActive(session);
    const settings = await db.transaction(async (tx) => {
      await lockVenue(tx, venue.id);
      const [current] = await tx.select().from(venues).where(eq(venues.id, venue.id)).limit(1);
      if (!current) throw notFound("Venue not found");
      const merged = mergeVenueSettings(parseVenueSettings(current.settings), body);
      await tx
        .update(venues)
        .set({ settings: merged, updatedAt: new Date() })
        .where(eq(venues.id, venue.id));
      return merged;
    });
    await publishEvents(deps.publisher, app.log, venue.id, [
      { type: "settings.updated", data: { settings } },
    ]);
    return settings;
  });
};
