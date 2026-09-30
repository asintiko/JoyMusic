import type { NowPlayingSource } from "@joymusic/shared";

export interface DetectedTrack {
  title: string;
  artist: string;
  album?: string;
  bpm?: number;
  key?: string;
  deck?: string;
  startedAt?: number;
  durationSec?: number;
  artworkUrl?: string;
}

export interface DeckState {
  deck: string;
  track: DetectedTrack | null;
  onAir?: boolean;
  playing?: boolean;
  loadedAt?: number;
}

export type AdapterState = "stopped" | "starting" | "waiting" | "active" | "unavailable" | "error";

export interface AdapterStatus {
  state: AdapterState;
  detail: string | null;
  since: number;
}

export interface NowPlayingSink {
  deck(state: DeckState): void;
  removeDeck(deck: string): void;
  track(track: DetectedTrack | null): void;
  status(state: AdapterState, detail?: string | null): void;
}

export interface NowPlayingAdapter {
  readonly id: string;
  readonly label: string;
  readonly source: NowPlayingSource;
  start(sink: NowPlayingSink): Promise<void>;
  stop(): Promise<void>;
  status(): AdapterStatus;
}

export type NowPlayingChangeReason = "changed" | "metadata" | "cleared";

export interface NowPlayingEvent {
  adapterId: string;
  source: NowPlayingSource;
  track: DetectedTrack | null;
  reason: NowPlayingChangeReason;
  at: number;
}

export interface StatusEvent {
  adapterId: string;
  status: AdapterStatus;
}

export interface AdapterInfo {
  id: string;
  label: string;
  source: NowPlayingSource;
  enabled: boolean;
  status: AdapterStatus;
  current: DetectedTrack | null;
}

export interface Clock {
  now(): number;
}

export interface TimerHandle {
  cancel(): void;
}

export interface Timers {
  after(ms: number, task: () => void): TimerHandle;
  every(ms: number, task: () => void): TimerHandle;
}
