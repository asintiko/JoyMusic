import { describe, expect, it } from "vitest";
import type { ServerEvent } from "@joymusic/shared";
import {
  activeMineCount,
  initialLiveState,
  liveReducer,
  overlayMine,
  sortedMine,
} from "@/guest/live-state";
import { makeRequest, makeTrack, makeVenueState } from "./helpers";

const envelope = { venueId: "ven_1", at: "2026-09-30T20:00:05.000Z" };

function upserted(seq: number, request: ReturnType<typeof makeRequest>): ServerEvent {
  return { ...envelope, seq, type: "request.upserted", data: { request } };
}

describe("liveReducer", () => {
  it("applies realtime events to the venue", () => {
    const state = initialLiveState(makeVenueState({ seq: 1 }));
    const next = liveReducer(state, {
      type: "event",
      event: upserted(2, makeRequest({ id: "req_a", status: "accepted", position: 1 })),
    });
    expect(next.venue?.queue.map((item) => item.id)).toEqual(["req_a"]);
    expect(next.venue?.seq).toBe(2);
  });

  it("ignores an older HTTP snapshot", () => {
    const state = initialLiveState(makeVenueState({ seq: 9 }));
    const next = liveReducer(state, { type: "venue", state: makeVenueState({ seq: 4 }) });
    expect(next).toBe(state);
  });

  it("accepts a newer HTTP snapshot", () => {
    const state = initialLiveState(makeVenueState({ seq: 1 }));
    const next = liveReducer(state, { type: "venue", state: makeVenueState({ seq: 4 }) });
    expect(next.venue?.seq).toBe(4);
  });

  it("replaces state from a websocket snapshot", () => {
    const state = initialLiveState(null);
    const snapshot = makeVenueState({ seq: 7 });
    const next = liveReducer(state, {
      type: "event",
      event: { ...envelope, seq: 7, type: "state.snapshot", data: snapshot },
    });
    expect(next.venue).toBe(snapshot);
  });

  it("keeps my note when the broadcast copy hides it", () => {
    let state = initialLiveState(makeVenueState());
    state = liveReducer(state, {
      type: "mine.upsert",
      request: makeRequest({ id: "req_a", note: "later please", dedicatedTo: "Aziz" }),
    });
    state = liveReducer(state, {
      type: "event",
      event: upserted(2, makeRequest({ id: "req_a", status: "pending", votes: 2 })),
    });
    expect(state.mine.req_a).toMatchObject({
      votes: 2,
      note: "later please",
      dedicatedTo: "Aziz",
      mine: true,
    });
  });

  it("tracks live status changes only for my requests", () => {
    let state = initialLiveState(makeVenueState());
    state = liveReducer(state, {
      type: "mine.replace",
      requests: [makeRequest({ id: "req_a", status: "pending" })],
    });
    state = liveReducer(state, {
      type: "event",
      event: upserted(2, makeRequest({ id: "req_a", status: "accepted", position: 1 })),
    });
    state = liveReducer(state, {
      type: "event",
      event: upserted(3, makeRequest({ id: "req_b", status: "accepted", position: 2 })),
    });
    expect(state.mine.req_a?.status).toBe("accepted");
    expect(state.mine.req_b).toBeUndefined();
  });

  it("drops removed requests from mine", () => {
    let state = initialLiveState(makeVenueState());
    state = liveReducer(state, { type: "mine.upsert", request: makeRequest({ id: "req_a" }) });
    state = liveReducer(state, {
      type: "event",
      event: { ...envelope, seq: 2, type: "request.removed", data: { requestId: "req_a" } },
    });
    expect(state.mine.req_a).toBeUndefined();
  });
});

describe("overlayMine", () => {
  it("marks my requests in every list", () => {
    const venue = makeVenueState({
      queue: [makeRequest({ id: "a", status: "accepted" })],
      pending: [makeRequest({ id: "b", track: makeTrack() })],
    });
    const overlaid = overlayMine(venue, { b: makeRequest({ id: "b", mine: true }) });
    expect(overlaid.queue[0]?.mine).toBe(false);
    expect(overlaid.pending[0]?.mine).toBe(true);
  });

  it("clears stale mine flags from broadcast items", () => {
    const venue = makeVenueState({ queue: [makeRequest({ id: "a", mine: true })] });
    expect(overlayMine(venue, {}).queue[0]?.mine).toBe(false);
  });
});

describe("sortedMine and activeMineCount", () => {
  const mine = {
    a: makeRequest({ id: "a", status: "played", updatedAt: "2026-09-30T20:00:00.000Z" }),
    b: makeRequest({ id: "b", status: "playing" }),
    c: makeRequest({ id: "c", status: "accepted", position: 2 }),
    d: makeRequest({ id: "d", status: "accepted", position: 1 }),
    e: makeRequest({ id: "e", status: "declined" }),
    f: makeRequest({ id: "f", status: "pending" }),
  };

  it("orders playing, queued by position, pending, then closed", () => {
    expect(sortedMine(mine).map((item) => item.id)).toEqual(["b", "d", "c", "f", "a", "e"]);
  });

  it("counts open requests", () => {
    expect(activeMineCount(mine)).toBe(4);
  });
});
