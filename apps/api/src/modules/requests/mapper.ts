import type { NowPlaying, RequestItem, RequestStatus, Track } from "@joymusic/shared";
import type { playLog, requests, tracks } from "../../db/schema";

export type RequestRow = typeof requests.$inferSelect;
export type TrackRow = typeof tracks.$inferSelect;
export type PlayLogRow = typeof playLog.$inferSelect;

const publiclyVisibleDetails: readonly RequestStatus[] = ["accepted", "playing", "played"];

export function toTrack(row: TrackRow): Track {
  return {
    id: row.id,
    source: row.source,
    sourceId: row.sourceId,
    title: row.title,
    artist: row.artist,
    album: row.album,
    artworkUrl: row.artworkUrl,
    previewUrl: row.previewUrl,
    durationSec: row.durationSec,
    explicit: row.explicit,
  };
}

export function toRequestItem(row: RequestRow, track: TrackRow | null, mine: boolean): RequestItem {
  const hasFreeText = row.freeTextArtist !== null && row.freeTextTitle !== null;
  return {
    id: row.id,
    sessionId: row.sessionId,
    venueId: row.venueId,
    track: track ? toTrack(track) : null,
    freeText:
      !track && hasFreeText
        ? { artist: row.freeTextArtist ?? "", title: row.freeTextTitle ?? "" }
        : null,
    title: row.title,
    artist: row.artist,
    artworkUrl: row.artworkUrl,
    note: row.note,
    dedicatedTo: row.dedicatedTo,
    tableLabel: row.tableLabel,
    votes: row.votes,
    status: row.status,
    declineReason: row.declineReason,
    position: row.position,
    mine,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function scrubRequestItem(item: RequestItem): RequestItem {
  if (item.note === null && item.dedicatedTo === null) return item;
  return { ...item, note: null, dedicatedTo: null };
}

export function forPublicAudience(item: RequestItem): RequestItem {
  if (publiclyVisibleDetails.includes(item.status)) return item;
  return scrubRequestItem(item);
}

export function toNowPlaying(
  log: PlayLogRow,
  track: TrackRow | null,
  dedicatedTo: string | null,
): NowPlaying {
  return {
    title: log.title,
    artist: log.artist,
    artworkUrl: log.artworkUrl,
    track: track ? toTrack(track) : null,
    startedAt: log.startedAt.toISOString(),
    durationSec: log.durationSec,
    bpm: log.bpm,
    key: log.key,
    source: log.source,
    requestId: log.requestId,
    dedicatedTo,
  };
}
