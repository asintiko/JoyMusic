import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import type { Executor, Transaction } from "../../db/client";
import { djSessions, playLog, requests } from "../../db/schema";
import type { VenueEventInput } from "../../realtime/publisher";
import { requestUpserted } from "../events";
import { loadRequestItems } from "../venues/state";
import type { SessionRecord } from "./summary";

export async function findIdleSessions(
  executor: Executor,
  cutoff: Date,
  venueId?: string,
): Promise<SessionRecord[]> {
  const venueFilter = venueId ? sql`and s.venue_id = ${venueId}` : sql``;
  const rows = await executor.execute<{ id: string }>(sql`
    select s.id from dj_sessions s
    where s.ended_at is null ${venueFilter}
    and greatest(
      s.started_at,
      coalesce((select max(r.updated_at) from requests r where r.session_id = s.id), s.started_at),
      coalesce((select max(p.started_at) from play_log p where p.session_id = s.id), s.started_at)
    ) < ${cutoff.toISOString()}::timestamptz
  `);
  const ids = rows.map((row) => row.id);
  if (ids.length === 0) return [];
  return executor.select().from(djSessions).where(inArray(djSessions.id, ids));
}

export async function endSession(
  tx: Transaction,
  session: SessionRecord,
  now: Date,
): Promise<VenueEventInput[]> {
  const expired = await tx
    .update(requests)
    .set({ status: "expired", position: null, updatedAt: now })
    .where(
      and(
        eq(requests.sessionId, session.id),
        inArray(requests.status, ["pending", "accepted", "playing"]),
      ),
    )
    .returning({ id: requests.id });
  const closedPlays = await tx
    .update(playLog)
    .set({ endedAt: now })
    .where(and(eq(playLog.sessionId, session.id), isNull(playLog.endedAt)))
    .returning({ id: playLog.id });
  await tx.update(djSessions).set({ endedAt: now }).where(eq(djSessions.id, session.id));
  const items = await loadRequestItems(
    tx,
    expired.map((row) => row.id),
    null,
  );
  const events: VenueEventInput[] = [...items.values()]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
    .map(requestUpserted);
  if (closedPlays.length > 0)
    events.push({ type: "nowplaying.updated", data: { nowPlaying: null } });
  events.push({ type: "session.changed", data: { session: null } });
  return events;
}
