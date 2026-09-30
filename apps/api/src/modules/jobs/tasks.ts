import type { FastifyBaseLogger } from "fastify";
import { and, eq, lt } from "drizzle-orm";
import type { Deps } from "../../deps";
import { requests } from "../../db/schema";
import { lockVenue } from "../../lib/venue-lock";
import { publishEvents, requestUpserted } from "../events";
import { endSession, findIdleSessions } from "../sessions/lifecycle";
import { loadRequestItems } from "../venues/state";

export interface JobTask {
  name: string;
  run(now: Date): Promise<number>;
}

export async function expireStalePendingRequests(
  deps: Deps,
  log: FastifyBaseLogger,
  now: Date,
): Promise<number> {
  const cutoff = new Date(now.getTime() - deps.config.jobs.requestExpiryMs);
  const expired = await deps.db
    .update(requests)
    .set({ status: "expired", position: null, updatedAt: now })
    .where(and(eq(requests.status, "pending"), lt(requests.createdAt, cutoff)))
    .returning({ id: requests.id, venueId: requests.venueId });
  if (expired.length === 0) return 0;
  const items = await loadRequestItems(
    deps.db,
    expired.map((row) => row.id),
    null,
  );
  const byVenue = new Map<string, string[]>();
  for (const row of expired)
    byVenue.set(row.venueId, [...(byVenue.get(row.venueId) ?? []), row.id]);
  for (const [venueId, ids] of byVenue) {
    const events = ids.flatMap((id) => {
      const item = items.get(id);
      return item ? [requestUpserted(item)] : [];
    });
    await publishEvents(deps.publisher, log, venueId, events);
  }
  return expired.length;
}

export async function endAbandonedSessions(
  deps: Deps,
  log: FastifyBaseLogger,
  now: Date,
): Promise<number> {
  const cutoff = new Date(now.getTime() - deps.config.jobs.sessionIdleMs);
  const idle = await findIdleSessions(deps.db, cutoff);
  let ended = 0;
  for (const candidate of idle) {
    const events = await deps.db.transaction(async (tx) => {
      await lockVenue(tx, candidate.venueId);
      const stillIdle = await findIdleSessions(tx, cutoff, candidate.venueId);
      const session = stillIdle.find((row) => row.id === candidate.id);
      if (!session) return null;
      return endSession(tx, session, now);
    });
    if (!events) continue;
    ended += 1;
    await publishEvents(deps.publisher, log, candidate.venueId, events);
  }
  return ended;
}

export function createJobTasks(deps: Deps, log: FastifyBaseLogger): JobTask[] {
  return [
    { name: "expire-pending-requests", run: (now) => expireStalePendingRequests(deps, log, now) },
    { name: "end-abandoned-sessions", run: (now) => endAbandonedSessions(deps, log, now) },
  ];
}
