import type { RequestItem, VenueState } from "./domain";
import type { ServerEvent } from "./realtime";

const recentlyPlayedLimit = 20;

function byQueueOrder(a: RequestItem, b: RequestItem): number {
  const left = a.position ?? Number.MAX_SAFE_INTEGER;
  const right = b.position ?? Number.MAX_SAFE_INTEGER;
  if (left !== right) return left - right;
  return a.createdAt.localeCompare(b.createdAt);
}

function byPopularity(a: RequestItem, b: RequestItem): number {
  if (a.votes !== b.votes) return b.votes - a.votes;
  return a.createdAt.localeCompare(b.createdAt);
}

function withoutRequest(list: RequestItem[], requestId: string): RequestItem[] {
  return list.filter((item) => item.id !== requestId);
}

function upsert(list: RequestItem[], request: RequestItem): RequestItem[] {
  return [...withoutRequest(list, request.id), request];
}

export function emptyVenueState(venue: VenueState["venue"], serverTime: string): VenueState {
  return {
    venue,
    session: null,
    nowPlaying: null,
    queue: [],
    pending: [],
    recentlyPlayed: [],
    seq: 0,
    serverTime,
  };
}

export function applyServerEvent(state: VenueState, event: ServerEvent): VenueState {
  if (event.type === "state.snapshot") return event.data;
  const next: VenueState = { ...state, seq: event.seq, serverTime: event.at };

  switch (event.type) {
    case "nowplaying.updated":
      return { ...next, nowPlaying: event.data.nowPlaying };
    case "settings.updated":
      return { ...next, venue: { ...state.venue, settings: event.data.settings } };
    case "session.changed":
      return { ...next, session: event.data.session };
    case "request.removed": {
      const id = event.data.requestId;
      return {
        ...next,
        queue: withoutRequest(state.queue, id),
        pending: withoutRequest(state.pending, id),
        recentlyPlayed: withoutRequest(state.recentlyPlayed, id),
      };
    }
    case "queue.reordered": {
      const positions = new Map(event.data.order.map((id, index) => [id, index + 1]));
      const queue = state.queue
        .map((item) => ({ ...item, position: positions.get(item.id) ?? item.position }))
        .sort(byQueueOrder);
      return { ...next, queue };
    }
    case "request.upserted": {
      const request = event.data.request;
      let queue = withoutRequest(state.queue, request.id);
      let pending = withoutRequest(state.pending, request.id);
      let recentlyPlayed = withoutRequest(state.recentlyPlayed, request.id);
      if (request.status === "pending") pending = upsert(pending, request).sort(byPopularity);
      else if (request.status === "accepted") queue = upsert(queue, request).sort(byQueueOrder);
      else if (request.status === "played") {
        recentlyPlayed = [request, ...recentlyPlayed].slice(0, recentlyPlayedLimit);
      }
      return { ...next, queue, pending, recentlyPlayed };
    }
  }
}

export function nowPlayingProgress(
  startedAt: string,
  durationSec: number | null,
  now: number,
  serverOffsetMs: number,
): number {
  if (!durationSec) return 0;
  const elapsedMs = now + serverOffsetMs - Date.parse(startedAt);
  return Math.min(1, Math.max(0, elapsedMs / (durationSec * 1000)));
}

export function serverOffset(serverTime: string, receivedAt: number): number {
  return Date.parse(serverTime) - receivedAt;
}
