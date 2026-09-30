import { compactTrack } from "../../core/keys";
import type { DeckState } from "../../core/types";

export interface StageLinqPlayerStatusLike {
  deck?: string;
  player?: number;
  title?: string;
  artist?: string;
  key?: string;
  currentBpm?: number;
  trackLength?: number;
  songLoaded?: boolean;
  play?: boolean;
  externalMixerVolume?: number;
}

export interface StageLinqMapOptions {
  useMixerVolume?: boolean;
}

export function stageLinqDeckId(status: StageLinqPlayerStatusLike): string | null {
  if (status.deck !== undefined && status.deck !== "") return status.deck;
  if (status.player !== undefined) return String(status.player);
  return null;
}

export function mapStageLinqDeck(
  status: StageLinqPlayerStatusLike,
  options: StageLinqMapOptions = {},
): DeckState | null {
  const deck = stageLinqDeckId(status);
  if (deck === null) return null;
  const state: DeckState = { deck, track: null };
  if (status.play !== undefined) state.playing = status.play;
  if (options.useMixerVolume && typeof status.externalMixerVolume === "number") {
    state.onAir = status.externalMixerVolume > 0.02;
  }
  if (status.songLoaded === false) return state;
  state.track = compactTrack({
    title: status.title,
    artist: status.artist,
    bpm: status.currentBpm,
    key: status.key,
    deck,
    durationSec: status.trackLength,
  });
  return state;
}
