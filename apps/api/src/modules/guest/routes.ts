import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, sql } from "drizzle-orm";
import { routes } from "@joymusic/shared";
import { guestDevices, qrCodes, requestVotes, requests, venues } from "../../db/schema";
import { AppError, forbidden, notFound } from "../../errors";
import { guestLimit } from "../../http/rate-limit";
import { registerRoute } from "../../http/register-route";
import { newId } from "../../lib/ids";
import { optionalGuest } from "../auth/guards";
import { publishEvents } from "../events";
import { scrubRequestItem } from "../requests/mapper";
import {
  buildVenueState,
  findActiveSession,
  findVenueBySlug,
  loadRequestItems,
  toPublicVenue,
} from "../venues/state";
import { createGuestRequest, voteForRequest } from "./service";
import { loadSuggestions } from "./suggestions";

export const guestRoutes: FastifyPluginAsync = async (app) => {
  const deps = app.deps;
  const { db, config } = deps;

  async function requireVenue(slug: string) {
    const venue = await findVenueBySlug(db, slug);
    if (!venue) throw notFound("Venue not found");
    return venue;
  }

  registerRoute(app, routes.venuePublic, async ({ params }) => {
    return toPublicVenue(await requireVenue(params.slug));
  });

  registerRoute(app, routes.venueState, async ({ params, request }) => {
    const venue = await requireVenue(params.slug);
    const guest = await optionalGuest(deps, request);
    return buildVenueState(deps, venue, {
      audience: "public",
      deviceId: guest?.venueId === venue.id ? guest.deviceId : null,
    });
  });

  registerRoute(app, routes.guestJoin, async ({ params, body }) => {
    const venue = await requireVenue(params.slug);
    const deviceId = body.deviceId ?? newId("dev");
    const tableLabel = await db.transaction(async (tx) => {
      const [device] = await tx
        .select({ bannedAt: guestDevices.bannedAt })
        .from(guestDevices)
        .where(and(eq(guestDevices.venueId, venue.id), eq(guestDevices.id, deviceId)))
        .limit(1);
      if (device?.bannedAt) throw forbidden("This device is blocked at this venue");
      const now = new Date();
      await tx
        .insert(guestDevices)
        .values({ id: deviceId, venueId: venue.id, firstSeenAt: now, lastSeenAt: now })
        .onConflictDoUpdate({
          target: [guestDevices.venueId, guestDevices.id],
          set: { lastSeenAt: now },
        });
      if (!body.tableToken) return null;
      const [code] = await tx
        .update(qrCodes)
        .set({ scans: sql`${qrCodes.scans} + 1` })
        .where(
          and(
            eq(qrCodes.venueId, venue.id),
            eq(qrCodes.token, body.tableToken),
            eq(qrCodes.active, true),
          ),
        )
        .returning({ label: qrCodes.label });
      return code?.label ?? null;
    });
    const guestToken = await deps.tokens.signGuestToken({ deviceId, venueId: venue.id });
    return { guestToken, deviceId, tableLabel };
  });

  registerRoute(
    app,
    routes.suggestions,
    async ({ params }) => loadSuggestions(deps, await requireVenue(params.slug)),
    { rateLimit: guestLimit(deps, config.rateLimit.searchMax) },
  );

  registerRoute(
    app,
    routes.catalogSearch,
    async ({ query }) => {
      try {
        return { tracks: await deps.catalog.search(query.q, query.limit) };
      } catch (error) {
        app.log.warn({ err: error }, "catalog search failed");
        throw new AppError("internal", 503, "The music catalog is temporarily unavailable");
      }
    },
    { rateLimit: guestLimit(deps, config.rateLimit.searchMax) },
  );

  registerRoute(
    app,
    routes.requestCreate,
    async ({ params, body, guest, reply }) => {
      const venue = await requireVenue(params.slug);
      const created = await createGuestRequest(deps, venue, guest, body);
      await publishEvents(deps.publisher, app.log, venue.id, created.events);
      if (!created.merged) reply.code(201);
      return { request: created.request, merged: created.merged };
    },
    { rateLimit: guestLimit(deps, config.rateLimit.requestMax) },
  );

  registerRoute(
    app,
    routes.requestVote,
    async ({ params, guest }) => {
      const [row] = await db
        .select({ venueId: requests.venueId })
        .from(requests)
        .where(eq(requests.id, params.id))
        .limit(1);
      if (!row || row.venueId !== guest.venueId) throw notFound("Request not found");
      const [venue] = await db.select().from(venues).where(eq(venues.id, row.venueId)).limit(1);
      if (!venue || venue.deletedAt) throw notFound("Request not found");
      const voted = await voteForRequest(deps, params.id, guest, venue);
      await publishEvents(deps.publisher, app.log, venue.id, voted.events);
      return voted.request;
    },
    { rateLimit: guestLimit(deps, config.rateLimit.requestMax * 2) },
  );

  registerRoute(app, routes.requestsMine, async ({ params, guest }) => {
    const venue = await requireVenue(params.slug);
    if (guest.venueId !== venue.id) throw forbidden("This guest token belongs to another venue");
    const active = await findActiveSession(db, venue.id);
    if (!active) return { requests: [] };
    const rows = await db
      .select({ id: requests.id, deviceId: requests.deviceId })
      .from(requests)
      .innerJoin(requestVotes, eq(requestVotes.requestId, requests.id))
      .where(
        and(eq(requests.sessionId, active.session.id), eq(requestVotes.deviceId, guest.deviceId)),
      )
      .orderBy(desc(requests.createdAt), desc(requests.id));
    const items = await loadRequestItems(
      db,
      rows.map((row) => row.id),
      guest.deviceId,
    );
    const ownerById = new Map(rows.map((row) => [row.id, row.deviceId]));
    return {
      requests: rows.flatMap((row) => {
        const item = items.get(row.id);
        if (!item) return [];
        return [ownerById.get(row.id) === guest.deviceId ? item : scrubRequestItem(item)];
      }),
    };
  });
};
