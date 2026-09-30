import type { NowPlaying, NowPlayingSource } from "@joymusic/shared";
import type { DetectedTrack } from "./types";

const minBpm = 40;
const maxBpm = 260;

function normalizeBpm(bpm: number | undefined): number | null {
  if (bpm === undefined || !Number.isFinite(bpm) || bpm <= 0) return null;
  let value = bpm;
  while (value < minBpm) value *= 2;
  while (value > maxBpm) value /= 2;
  return value >= minBpm && value <= maxBpm ? Math.round(value * 10) / 10 : null;
}

export function toNowPlaying(
  track: DetectedTrack,
  source: NowPlayingSource,
  fallbackStartedAt: number,
): NowPlaying {
  const startedAt = track.startedAt ?? fallbackStartedAt;
  return {
    title: track.title.slice(0, 200),
    artist: track.artist.slice(0, 200),
    artworkUrl: track.artworkUrl ?? null,
    track: null,
    startedAt: new Date(startedAt).toISOString(),
    durationSec: track.durationSec && track.durationSec > 0 ? Math.round(track.durationSec) : null,
    bpm: normalizeBpm(track.bpm),
    key: track.key ? track.key.slice(0, 8) : null,
    source,
    requestId: null,
    dedicatedTo: null,
  };
}
