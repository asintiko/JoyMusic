import { and, eq, isNull, ne, sql } from "drizzle-orm";
import type { NowPlayingSource, RequestItem } from "@joymusic/shared";
import type { Transaction } from "../../db/client";
import { playLog, requests } from "../../db/schema";
import { newId } from "../../lib/ids";
import type { VenueEventInput } from "../../realtime/publisher";
import { requestUpserted } from "../events";
import { loadNowPlaying, loadRequestItems } from "../venues/state";

export async function nextQueuePosition(tx: Transaction, sessionId: string): Promise<number> {
  const [row] = await tx
    .select({ last: sql<number>`coalesce(max(${requests.position}), 0)::int` })
    .from(requests)
    .where(and(eq(requests.sessionId, sessionId), eq(requests.status, "accepted")));
  return (row?.last ?? 0) + 1;
}

export async function markPreviousPlayed(
  tx: Transaction,
  sessionId: string,
  exceptRequestId: string | null,
  now: Date,
): Promise<string[]> {
  const rows = await tx
    .update(requests)
    .set({ status: "played", playedAt: now, position: null, updatedAt: now })
    .where(
      and(
        eq(requests.sessionId, sessionId),
        eq(requests.status, "playing"),
        exceptRequestId ? ne(requests.id, exceptRequestId) : undefined,
      ),
    )
    .returning({ id: requests.id });
  return rows.map((row) => row.id);
}

export async function closeCurrentPlay(
  tx: Transaction,
  sessionId: string,
  now: Date,
): Promise<boolean> {
  const rows = await tx
    .update(playLog)
    .set({ endedAt: now })
    .where(and(eq(playLog.sessionId, sessionId), isNull(playLog.endedAt)))
    .returning({ id: playLog.id });
  return rows.length > 0;
}

export interface PlayStart {
  sessionId: string;
  venueId: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  trackId: string | null;
  source: NowPlayingSource;
  requestId: string | null;
  durationSec: number | null;
  bpm: number | null;
  key: string | null;
  startedAt: Date;
}

export async function beginPlay(tx: Transaction, start: PlayStart): Promise<void> {
  await tx.insert(playLog).values({ id: newId("plg"), ...start });
}

export async function requestEvents(
  tx: Transaction,
  requestIds: readonly string[],
): Promise<VenueEventInput[]> {
  const items = await loadRequestItems(tx, requestIds, null);
  return requestIds.flatMap((id) => {
    const item: RequestItem | undefined = items.get(id);
    return item ? [requestUpserted(item)] : [];
  });
}

export async function nowPlayingEvent(
  tx: Transaction,
  sessionId: string,
): Promise<VenueEventInput> {
  return { type: "nowplaying.updated", data: { nowPlaying: await loadNowPlaying(tx, sessionId) } };
}
