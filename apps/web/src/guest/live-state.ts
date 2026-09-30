import { applyServerEvent } from "@joymusic/shared";
import type { RequestItem, ServerEvent, VenueState } from "@joymusic/shared";

export interface LiveState {
  venue: VenueState | null;
  mine: Record<string, RequestItem>;
}

export type LiveAction =
  | { type: "venue"; state: VenueState }
  | { type: "event"; event: ServerEvent }
  | { type: "mine.replace"; requests: RequestItem[] }
  | { type: "mine.upsert"; request: RequestItem };

export function initialLiveState(venue: VenueState | null): LiveState {
  return { venue, mine: {} };
}

function mergeMine(previous: RequestItem | undefined, incoming: RequestItem): RequestItem {
  return {
    ...incoming,
    note: incoming.note ?? previous?.note ?? null,
    dedicatedTo: incoming.dedicatedTo ?? previous?.dedicatedTo ?? null,
    mine: true,
  };
}

function sameMine(a: Record<string, RequestItem>, b: Record<string, RequestItem>): boolean {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => {
    const left = a[key];
    const right = b[key];
    return Boolean(
      left && right && left.updatedAt === right.updatedAt && left.status === right.status,
    );
  });
}

function withoutKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  const { [key]: _removed, ...rest } = record;
  return rest;
}

export function liveReducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case "venue": {
      if (state.venue && action.state.seq <= state.venue.seq) return state;
      return { ...state, venue: action.state };
    }
    case "mine.replace": {
      const mine: Record<string, RequestItem> = {};
      for (const request of action.requests) {
        mine[request.id] = mergeMine(state.mine[request.id], request);
      }
      return sameMine(state.mine, mine) ? state : { ...state, mine };
    }
    case "mine.upsert":
      return {
        ...state,
        mine: {
          ...state.mine,
          [action.request.id]: mergeMine(state.mine[action.request.id], action.request),
        },
      };
    case "event": {
      const event = action.event;
      let venue = state.venue;
      if (event.type === "state.snapshot") {
        if (venue && event.data.seq === venue.seq) return state;
        venue = event.data;
      } else if (venue) venue = applyServerEvent(venue, event);
      let mine = state.mine;
      if (event.type === "request.upserted" && mine[event.data.request.id]) {
        const request = event.data.request;
        mine = { ...mine, [request.id]: mergeMine(mine[request.id], request) };
      }
      if (event.type === "request.removed" && mine[event.data.requestId]) {
        mine = withoutKey(mine, event.data.requestId);
      }
      return { venue, mine };
    }
  }
}

function markMine(items: RequestItem[], mine: Record<string, RequestItem>): RequestItem[] {
  return items.map((item) => {
    const own = mine[item.id];
    if (!own) return item.mine ? { ...item, mine: false } : item;
    return {
      ...item,
      mine: true,
      note: item.note ?? own.note,
      dedicatedTo: item.dedicatedTo ?? own.dedicatedTo,
    };
  });
}

export function overlayMine(venue: VenueState, mine: Record<string, RequestItem>): VenueState {
  return {
    ...venue,
    queue: markMine(venue.queue, mine),
    pending: markMine(venue.pending, mine),
    recentlyPlayed: markMine(venue.recentlyPlayed, mine),
  };
}

export function sortedMine(mine: Record<string, RequestItem>): RequestItem[] {
  const rank: Record<RequestItem["status"], number> = {
    playing: 0,
    accepted: 1,
    pending: 2,
    played: 3,
    declined: 4,
    expired: 5,
  };
  return Object.values(mine).sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) return rank[a.status] - rank[b.status];
    if (a.status === "accepted" && a.position !== b.position) {
      return (a.position ?? Number.MAX_SAFE_INTEGER) - (b.position ?? Number.MAX_SAFE_INTEGER);
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}

export function activeMineCount(mine: Record<string, RequestItem>): number {
  return Object.values(mine).filter(
    (item) => item.status === "pending" || item.status === "accepted" || item.status === "playing",
  ).length;
}
