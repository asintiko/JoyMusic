import { describe, expect, it } from "vitest";
import { defaultVenueSettings, type RequestItem, type VenueState } from "./domain";
import type { ServerEvent } from "./realtime";
import { applyServerEvent, emptyVenueState, nowPlayingProgress } from "./venue-state";

const venue = {
  id: "v1",
  slug: "joy-demo-club",
  name: "Joy Demo Club",
  city: "Tashkent",
  theme: "club" as const,
  logoUrl: null,
  coverUrl: null,
  settings: defaultVenueSettings,
};

function request(id: string, overrides: Partial<RequestItem> = {}): RequestItem {
  return {
    id,
    sessionId: "s1",
    venueId: "v1",
    track: null,
    freeText: { artist: "Artist", title: `Title ${id}` },
    title: `Title ${id}`,
    artist: "Artist",
    artworkUrl: null,
    note: null,
    dedicatedTo: null,
    tableLabel: null,
    votes: 1,
    status: "pending",
    declineReason: null,
    position: null,
    mine: false,
    createdAt: `2026-01-01T00:00:0${id}.000Z`,
    updatedAt: `2026-01-01T00:00:0${id}.000Z`,
    ...overrides,
  };
}

function event<T extends ServerEvent["type"]>(
  type: T,
  seq: number,
  data: Extract<ServerEvent, { type: T }>["data"],
): ServerEvent {
  return { type, seq, venueId: "v1", at: "2026-01-01T00:01:00.000Z", data } as ServerEvent;
}

function baseState(): VenueState {
  return emptyVenueState(venue, "2026-01-01T00:00:00.000Z");
}

describe("applyServerEvent", () => {
  it("adds pending requests sorted by votes then age", () => {
    let state = baseState();
    state = applyServerEvent(state, event("request.upserted", 1, { request: request("1") }));
    state = applyServerEvent(
      state,
      event("request.upserted", 2, { request: request("2", { votes: 5 }) }),
    );
    expect(state.pending.map((item) => item.id)).toEqual(["2", "1"]);
    expect(state.seq).toBe(2);
  });

  it("moves an accepted request from pending to the ordered queue", () => {
    let state = baseState();
    state = applyServerEvent(state, event("request.upserted", 1, { request: request("1") }));
    state = applyServerEvent(
      state,
      event("request.upserted", 2, {
        request: request("1", { status: "accepted", position: 2 }),
      }),
    );
    state = applyServerEvent(
      state,
      event("request.upserted", 3, {
        request: request("2", { status: "accepted", position: 1 }),
      }),
    );
    expect(state.pending).toHaveLength(0);
    expect(state.queue.map((item) => item.id)).toEqual(["2", "1"]);
  });

  it("reorders the queue", () => {
    let state = baseState();
    for (const [index, id] of ["1", "2", "3"].entries()) {
      state = applyServerEvent(
        state,
        event("request.upserted", index + 1, {
          request: request(id, { status: "accepted", position: index + 1 }),
        }),
      );
    }
    state = applyServerEvent(state, event("queue.reordered", 4, { order: ["3", "1", "2"] }));
    expect(state.queue.map((item) => item.id)).toEqual(["3", "1", "2"]);
    expect(state.queue.map((item) => item.position)).toEqual([1, 2, 3]);
  });

  it("records played requests as recently played and caps the list", () => {
    let state = baseState();
    for (let index = 1; index <= 25; index += 1) {
      const id = String(index).padStart(2, "0");
      state = applyServerEvent(
        state,
        event("request.upserted", index, { request: request(id, { status: "played" }) }),
      );
    }
    expect(state.recentlyPlayed).toHaveLength(20);
    expect(state.recentlyPlayed[0]?.id).toBe("25");
  });

  it("drops declined and removed requests everywhere", () => {
    let state = baseState();
    state = applyServerEvent(state, event("request.upserted", 1, { request: request("1") }));
    state = applyServerEvent(
      state,
      event("request.upserted", 2, { request: request("1", { status: "declined" }) }),
    );
    expect(state.pending).toHaveLength(0);
    expect(state.queue).toHaveLength(0);
    state = applyServerEvent(state, event("request.upserted", 3, { request: request("2") }));
    state = applyServerEvent(state, event("request.removed", 4, { requestId: "2" }));
    expect(state.pending).toHaveLength(0);
  });

  it("replaces state on snapshot and updates settings and session", () => {
    const snapshot: VenueState = { ...baseState(), seq: 42 };
    let state = applyServerEvent(baseState(), event("state.snapshot", 42, snapshot));
    expect(state.seq).toBe(42);
    state = applyServerEvent(
      state,
      event("settings.updated", 43, {
        settings: { ...defaultVenueSettings, requestsOpen: false },
      }),
    );
    expect(state.venue.settings.requestsOpen).toBe(false);
    state = applyServerEvent(
      state,
      event("session.changed", 44, {
        session: { id: "s1", djName: "DJ Nur", startedAt: "2026-01-01T00:00:00.000Z" },
      }),
    );
    expect(state.session?.djName).toBe("DJ Nur");
  });
});

describe("nowPlayingProgress", () => {
  it("clamps between zero and one and accounts for the server offset", () => {
    const startedAt = "2026-01-01T00:00:00.000Z";
    const start = Date.parse(startedAt);
    expect(nowPlayingProgress(startedAt, 100, start + 50_000, 0)).toBeCloseTo(0.5);
    expect(nowPlayingProgress(startedAt, 100, start + 50_000, 10_000)).toBeCloseTo(0.6);
    expect(nowPlayingProgress(startedAt, 100, start + 500_000, 0)).toBe(1);
    expect(nowPlayingProgress(startedAt, 100, start - 5_000, 0)).toBe(0);
    expect(nowPlayingProgress(startedAt, null, start, 0)).toBe(0);
  });
});
