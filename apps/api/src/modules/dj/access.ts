import { and, eq, isNull } from "drizzle-orm";
import type { Deps } from "../../deps";
import type { AuthUser } from "../../http/context";
import { djSessions, requests, venues } from "../../db/schema";
import { conflict, notFound } from "../../errors";
import { anyRole, assertVenueAccess } from "../auth/guards";
import type { SessionRecord } from "../sessions/summary";
import type { VenueRecord } from "../venues/service";
import type { RequestRow } from "../requests/mapper";

export async function authorizeVenue(
  deps: Deps,
  user: AuthUser,
  venueId: string,
): Promise<VenueRecord> {
  return assertVenueAccess(deps, user, venueId, anyRole);
}

export async function authorizeSession(
  deps: Deps,
  user: AuthUser,
  sessionId: string,
): Promise<{ session: SessionRecord; venue: VenueRecord }> {
  const [session] = await deps.db
    .select()
    .from(djSessions)
    .where(eq(djSessions.id, sessionId))
    .limit(1);
  if (!session) throw notFound("Session not found");
  const venue = await authorizeVenue(deps, user, session.venueId);
  return { session, venue };
}

export async function authorizeRequest(
  deps: Deps,
  user: AuthUser,
  requestId: string,
): Promise<{ request: RequestRow; venue: VenueRecord }> {
  const [row] = await deps.db.select().from(requests).where(eq(requests.id, requestId)).limit(1);
  if (!row) throw notFound("Request not found");
  const venue = await authorizeVenue(deps, user, row.venueId);
  return { request: row, venue };
}

export function assertSessionActive(session: SessionRecord): void {
  if (session.endedAt) throw conflict("This session has ended");
}

export async function loadVenueById(deps: Deps, venueId: string): Promise<VenueRecord> {
  const [venue] = await deps.db
    .select()
    .from(venues)
    .where(and(eq(venues.id, venueId), isNull(venues.deletedAt)))
    .limit(1);
  if (!venue) throw notFound("Venue not found");
  return venue;
}
