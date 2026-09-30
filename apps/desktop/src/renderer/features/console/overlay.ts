import type { NowPlaying, RequestItem, VenueState } from "@joymusic/shared";
import type { OutboxCommand } from "../../../common/commands";

function byPosition(left: RequestItem, right: RequestItem): number {
  const a = left.position ?? Number.MAX_SAFE_INTEGER;
  const b = right.position ?? Number.MAX_SAFE_INTEGER;
  if (a !== b) return a - b;
  return left.createdAt.localeCompare(right.createdAt);
}

function findRequest(state: VenueState, id: string): RequestItem | undefined {
  return state.pending.find((item) => item.id === id) ?? state.queue.find((item) => item.id === id);
}

function nowPlayingFromRequest(request: RequestItem, now: number): NowPlaying {
  return {
    title: request.title,
    artist: request.artist,
    artworkUrl: request.artworkUrl,
    track: request.track,
    startedAt: new Date(now).toISOString(),
    durationSec: request.track?.durationSec ?? null,
    bpm: null,
    key: null,
    source: "request",
    requestId: request.id,
    dedicatedTo: request.dedicatedTo,
  };
}

function applyOne(state: VenueState, command: OutboxCommand, now: number): VenueState {
  switch (command.kind) {
    case "accept": {
      const request = state.pending.find((item) => item.id === command.requestId);
      if (!request) return state;
      const last = state.queue.reduce((max, item) => Math.max(max, item.position ?? 0), 0);
      return {
        ...state,
        pending: state.pending.filter((item) => item.id !== request.id),
        queue: [...state.queue, { ...request, status: "accepted", position: last + 1 }],
      };
    }
    case "decline":
      return {
        ...state,
        pending: state.pending.filter((item) => item.id !== command.requestId),
        queue: state.queue.filter((item) => item.id !== command.requestId),
      };
    case "play": {
      const request = findRequest(state, command.requestId);
      if (!request) return state;
      return {
        ...state,
        pending: state.pending.filter((item) => item.id !== request.id),
        queue: state.queue.filter((item) => item.id !== request.id),
        nowPlaying: nowPlayingFromRequest(request, now),
      };
    }
    case "played": {
      if (state.nowPlaying?.requestId !== command.requestId) return state;
      return { ...state, nowPlaying: null };
    }
    case "reorder": {
      const positions = new Map(command.order.map((id, index) => [id, index + 1]));
      const queue = state.queue
        .map((item) => ({ ...item, position: positions.get(item.id) ?? item.position }))
        .sort(byPosition);
      return { ...state, queue };
    }
    case "settings":
      return {
        ...state,
        venue: { ...state.venue, settings: { ...state.venue.settings, ...command.patch } },
      };
    case "nowplaying.clear":
      return { ...state, nowPlaying: null };
    case "nowplaying.set":
      return state;
  }
}

export function applyPendingCommands(
  state: VenueState,
  commands: readonly OutboxCommand[],
  now: number,
): VenueState {
  return commands.reduce((current, command) => applyOne(current, command, now), state);
}

export function moveId(order: readonly string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= order.length || to >= order.length) {
    return [...order];
  }
  const next = [...order];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return [...order];
  next.splice(to, 0, moved);
  return next;
}

export function reorderIds(order: readonly string[], activeId: string, overId: string): string[] {
  return moveId(order, order.indexOf(activeId), order.indexOf(overId));
}
