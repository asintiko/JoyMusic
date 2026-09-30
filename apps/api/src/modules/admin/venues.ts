import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { and, asc, eq, isNull } from "drizzle-orm";
import { defaultVenueSettings, routes } from "@joymusic/shared";
import { djSessions, venues } from "../../db/schema";
import { badRequest, conflict, isUniqueViolation, notFound } from "../../errors";
import { registerAdminRoute } from "../../http/register-route";
import { newId } from "../../lib/ids";
import { isValidTimeZone } from "../../lib/time";
import type { VenueEventInput } from "../../realtime/publisher";
import { recordAudit } from "../audit/service";
import { adminRoles, assertVenueAccess } from "../auth/guards";
import {
  activeSessionIds,
  loadAdminVenue,
  mergeVenueSettings,
  parseVenueSettings,
  toAdminVenue,
} from "../venues/service";

function assertTimezone(timezone: string | undefined): void {
  if (timezone !== undefined && !isValidTimeZone(timezone)) {
    throw badRequest("Unknown timezone", [
      { path: ["timezone"], code: "custom", message: "Unknown IANA timezone" },
    ]);
  }
}

async function publishSafely(app: FastifyInstance, venueId: string, event: VenueEventInput) {
  try {
    await app.deps.publisher.publish(venueId, event);
  } catch (error) {
    app.log.warn({ err: error, venueId }, "failed to publish venue event");
  }
}

export const adminVenueRoutes: FastifyPluginAsync = async (app) => {
  const { db } = app.deps;

  registerAdminRoute(app, routes.adminVenues, async ({ org }) => {
    const rows = await db
      .select()
      .from(venues)
      .where(and(eq(venues.organizationId, org.organizationId), isNull(venues.deletedAt)))
      .orderBy(asc(venues.createdAt), asc(venues.id));
    const sessions = await activeSessionIds(
      db,
      rows.map((row) => row.id),
    );
    return { venues: rows.map((row) => toAdminVenue(row, sessions.get(row.id) ?? null)) };
  });

  registerAdminRoute(app, routes.adminVenueCreate, async ({ body, org, user, reply }) => {
    assertTimezone(body.timezone);
    const venueId = newId("ven");
    try {
      const created = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(venues)
          .values({
            id: venueId,
            organizationId: org.organizationId,
            slug: body.slug,
            name: body.name,
            city: body.city ?? null,
            address: body.address ?? null,
            theme: body.theme,
            timezone: body.timezone,
            settings: defaultVenueSettings,
          })
          .returning();
        await recordAudit(tx, {
          organizationId: org.organizationId,
          actorUserId: user.id,
          action: "venue.create",
          target: venueId,
          meta: { slug: body.slug, name: body.name },
        });
        return row;
      });
      if (!created) throw notFound();
      reply.code(201);
      return toAdminVenue(created, null);
    } catch (error) {
      if (isUniqueViolation(error, "venues_slug_unique")) {
        throw conflict("A venue with this slug already exists");
      }
      throw error;
    }
  });

  registerAdminRoute(app, routes.adminVenueGet, async ({ params, user }) => {
    await assertVenueAccess(app.deps, user, params.venueId, adminRoles);
    const venue = await loadAdminVenue(db, params.venueId);
    if (!venue) throw notFound("Venue not found");
    return venue;
  });

  registerAdminRoute(app, routes.adminVenueUpdate, async ({ params, body, user }) => {
    const venue = await assertVenueAccess(app.deps, user, params.venueId, adminRoles);
    assertTimezone(body.timezone);
    const settings = body.settings
      ? mergeVenueSettings(parseVenueSettings(venue.settings), body.settings)
      : undefined;
    await db.transaction(async (tx) => {
      await tx
        .update(venues)
        .set({
          name: body.name,
          city: body.city,
          address: body.address,
          theme: body.theme,
          timezone: body.timezone,
          logoUrl: body.logoUrl,
          coverUrl: body.coverUrl,
          settings,
          updatedAt: new Date(),
        })
        .where(eq(venues.id, venue.id));
      await recordAudit(tx, {
        organizationId: venue.organizationId,
        actorUserId: user.id,
        action: "venue.update",
        target: venue.id,
        meta: { fields: Object.keys(body).filter((key) => body[key as keyof typeof body] !== undefined) },
      });
    });
    if (settings) {
      await publishSafely(app, venue.id, { type: "settings.updated", data: { settings } });
    }
    const updated = await loadAdminVenue(db, venue.id);
    if (!updated) throw notFound("Venue not found");
    return updated;
  });

  registerAdminRoute(app, routes.adminVenueDelete, async ({ params, user }) => {
    const venue = await assertVenueAccess(app.deps, user, params.venueId, adminRoles);
    const now = new Date();
    const endedSession = await db.transaction(async (tx) => {
      const [ended] = await tx
        .update(djSessions)
        .set({ endedAt: now })
        .where(and(eq(djSessions.venueId, venue.id), isNull(djSessions.endedAt)))
        .returning({ id: djSessions.id });
      await tx.update(venues).set({ deletedAt: now, updatedAt: now }).where(eq(venues.id, venue.id));
      await recordAudit(tx, {
        organizationId: venue.organizationId,
        actorUserId: user.id,
        action: "venue.delete",
        target: venue.id,
        meta: { slug: venue.slug, name: venue.name },
      });
      return ended ?? null;
    });
    if (endedSession) {
      await publishSafely(app, venue.id, { type: "session.changed", data: { session: null } });
    }
    return { ok: true as const };
  });
};
