import type { RequestItem, VenueState } from "@joymusic/shared";

export type TvMode = "playing" | "idle" | "waiting";

export function tvMode(state: VenueState | null): TvMode {
  if (!state || !state.session) return "waiting";
  return state.nowPlaying ? "playing" : "idle";
}

export interface TvDedication {
  id: string;
  name: string;
  title: string;
}

export function tvDedications(state: VenueState, limit = 3): TvDedication[] {
  return state.queue
    .filter((item) => item.status === "accepted" && item.dedicatedTo)
    .slice(0, limit)
    .map((item) => ({ id: item.id, name: item.dedicatedTo ?? "", title: item.title }));
}

export interface TvTickerEntry {
  id: string;
  title: string;
  artist: string;
  votes: number;
  pending: boolean;
}

export function tvTicker(state: VenueState, skip: number, limit = 12): TvTickerEntry[] {
  const queued: TvTickerEntry[] = state.queue.slice(skip).map((item) => toEntry(item, false));
  const pending: TvTickerEntry[] = state.pending.map((item) => toEntry(item, true));
  return [...queued, ...pending].slice(0, limit);
}

function toEntry(item: RequestItem, pending: boolean): TvTickerEntry {
  return { id: item.id, title: item.title, artist: item.artist, votes: item.votes, pending };
}

export function stageScale(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 1;
  return Math.min(width / 1920, height / 1080);
}
