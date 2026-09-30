import { compactTrack } from "../../core/keys";
import type { DeckState } from "../../core/types";

export interface ProlinkStatusLike {
  deviceId: number;
  trackId: number;
  trackDeviceId: number;
  trackSlot: number;
  trackType: number;
  playState: number;
  isOnAir: boolean;
  trackBPM: number | null;
}

export interface ProlinkTrackLike {
  title: string;
  duration?: number;
  tempo?: number;
  artist?: { name: string } | null;
  album?: { name: string } | null;
  key?: { name: string } | null;
}

export const prolinkPlayState = {
  empty: 0,
  loading: 2,
  playing: 3,
  looping: 4,
  paused: 5,
  cued: 6,
  cuing: 7,
  platterHeld: 8,
  searching: 9,
  spunDown: 14,
  ended: 17,
} as const;

const audiblePlayStates: ReadonlySet<number> = new Set([
  prolinkPlayState.playing,
  prolinkPlayState.looping,
  prolinkPlayState.cuing,
  prolinkPlayState.searching,
]);

export function prolinkTrackKey(status: ProlinkStatusLike): string {
  return [
    status.deviceId,
    status.trackDeviceId,
    status.trackSlot,
    status.trackType,
    status.trackId,
  ].join(":");
}

export function prolinkDeckEmpty(status: ProlinkStatusLike): boolean {
  return status.trackId === 0 || status.playState === prolinkPlayState.empty;
}

export function mapProlinkDeck(
  status: ProlinkStatusLike,
  metadata: ProlinkTrackLike | null,
): DeckState {
  const deck = String(status.deviceId);
  const state: DeckState = {
    deck,
    track: null,
    onAir: status.isOnAir,
    playing: audiblePlayStates.has(status.playState),
  };
  if (metadata === null || prolinkDeckEmpty(status)) return state;
  state.track = compactTrack({
    title: metadata.title,
    artist: metadata.artist?.name ?? "",
    album: metadata.album?.name,
    bpm: status.trackBPM ?? metadata.tempo,
    key: metadata.key?.name,
    deck,
    durationSec: metadata.duration,
  });
  return state;
}
