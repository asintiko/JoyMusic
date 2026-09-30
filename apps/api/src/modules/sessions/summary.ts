import { count, eq, inArray } from "drizzle-orm";
import type { SessionSummary } from "@joymusic/shared";
import type { Executor } from "../../db/client";
import { djSessions, playLog, requests, users } from "../../db/schema";

export type SessionRecord = typeof djSessions.$inferSelect;

export async function summarizeSessions(
  executor: Executor,
  sessions: readonly SessionRecord[],
): Promise<SessionSummary[]> {
  if (sessions.length === 0) return [];
  const sessionIds = sessions.map((session) => session.id);
  const djIds = [...new Set(sessions.map((session) => session.djUserId))];
  const [requestCounts, playCounts, djs] = await Promise.all([
    executor
      .select({ sessionId: requests.sessionId, total: count() })
      .from(requests)
      .where(inArray(requests.sessionId, sessionIds))
      .groupBy(requests.sessionId),
    executor
      .select({ sessionId: playLog.sessionId, total: count() })
      .from(playLog)
      .where(inArray(playLog.sessionId, sessionIds))
      .groupBy(playLog.sessionId),
    executor.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, djIds)),
  ]);
  const requestsBySession = new Map(requestCounts.map((row) => [row.sessionId, row.total]));
  const playedBySession = new Map(playCounts.map((row) => [row.sessionId, row.total]));
  const namesByUser = new Map(djs.map((row) => [row.id, row.name]));
  return sessions.map((session) => ({
    id: session.id,
    venueId: session.venueId,
    djId: session.djUserId,
    djName: namesByUser.get(session.djUserId) ?? "",
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt ? session.endedAt.toISOString() : null,
    requestsTotal: requestsBySession.get(session.id) ?? 0,
    playedTotal: playedBySession.get(session.id) ?? 0,
  }));
}

export async function loadSessionSummary(
  executor: Executor,
  sessionId: string,
): Promise<SessionSummary | null> {
  const [session] = await executor
    .select()
    .from(djSessions)
    .where(eq(djSessions.id, sessionId))
    .limit(1);
  if (!session) return null;
  const [summary] = await summarizeSessions(executor, [session]);
  return summary ?? null;
}
