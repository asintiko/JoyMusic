import { describe, expect, it } from "vitest";
import { deriveConsoleView, stepSelection } from "../../src/renderer/features/console/derive";
import { intentForKey, intentForMidi } from "../../src/renderer/features/console/intents";
import type { KeyLike } from "../../src/renderer/features/console/intents";
import {
  applyPendingCommands,
  moveId,
  reorderIds,
} from "../../src/renderer/features/console/overlay";
import { makeRequest, makeState } from "./support/fake-bridge";

const key = (name: string, extra: Partial<KeyLike> = {}): KeyLike => ({
  key: name,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...extra,
});

describe("keyboard intents", () => {
  it("maps the documented shortcuts", () => {
    expect(intentForKey(key("a"))).toEqual({ type: "accept" });
    expect(intentForKey(key("A"))).toEqual({ type: "accept" });
    expect(intentForKey(key("d"))).toEqual({ type: "decline" });
    expect(intentForKey(key("l"))).toEqual({ type: "later" });
    expect(intentForKey(key(" "))).toEqual({ type: "playNext" });
    expect(intentForKey(key("p"))).toEqual({ type: "markPlayed" });
    expect(intentForKey(key("ArrowDown"))).toEqual({ type: "moveIncoming", delta: 1 });
    expect(intentForKey(key("ArrowUp"))).toEqual({ type: "moveIncoming", delta: -1 });
    expect(intentForKey(key("ArrowDown", { shiftKey: true }))).toEqual({
      type: "moveQueue",
      delta: 1,
    });
    expect(intentForKey(key("ArrowUp", { altKey: true }))).toEqual({
      type: "reorderQueue",
      delta: -1,
    });
  });

  it("leaves command shortcuts and unknown keys alone", () => {
    expect(intentForKey(key("k", { metaKey: true }))).toBeNull();
    expect(intentForKey(key("a", { ctrlKey: true }))).toBeNull();
    expect(intentForKey(key("a", { altKey: true }))).toBeNull();
    expect(intentForKey(key("x"))).toBeNull();
    expect(intentForKey(key("Tab"))).toBeNull();
  });

  it("maps every MIDI console action", () => {
    expect(intentForMidi({ type: "acceptTop" })).toEqual({ type: "accept" });
    expect(intentForMidi({ type: "declineTop" })).toEqual({ type: "declineNow" });
    expect(intentForMidi({ type: "playNext" })).toEqual({ type: "playNext" });
    expect(intentForMidi({ type: "pushToAir" })).toEqual({ type: "playSelected" });
    expect(intentForMidi({ type: "markPlayed" })).toEqual({ type: "markPlayed" });
    expect(intentForMidi({ type: "toggleRequestsOpen" })).toEqual({ type: "toggleRequests" });
    expect(intentForMidi({ type: "moveSelection", delta: -1 })).toEqual({
      type: "moveIncoming",
      delta: -1,
    });
  });
});

describe("optimistic overlay", () => {
  const state = makeState({
    pending: [makeRequest("p1"), makeRequest("p2")],
    queue: [
      makeRequest("q1", { status: "accepted", position: 1 }),
      makeRequest("q2", { status: "accepted", position: 2 }),
    ],
  });

  it("moves an accepted request to the end of the queue", () => {
    const next = applyPendingCommands(state, [{ kind: "accept", requestId: "p1" }], 0);
    expect(next.pending.map((item) => item.id)).toEqual(["p2"]);
    expect(next.queue.map((item) => item.id)).toEqual(["q1", "q2", "p1"]);
    expect(next.queue[2]?.position).toBe(3);
  });

  it("removes declined requests everywhere", () => {
    const next = applyPendingCommands(
      state,
      [
        { kind: "decline", requestId: "p2" },
        { kind: "decline", requestId: "q1" },
      ],
      0,
    );
    expect(next.pending.map((item) => item.id)).toEqual(["p1"]);
    expect(next.queue.map((item) => item.id)).toEqual(["q2"]);
  });

  it("puts a played request on air and clears it when marked played", () => {
    const onAir = applyPendingCommands(
      state,
      [{ kind: "play", requestId: "q2" }],
      1_700_000_000_000,
    );
    expect(onAir.nowPlaying?.requestId).toBe("q2");
    expect(onAir.queue.map((item) => item.id)).toEqual(["q1"]);
    const done = applyPendingCommands(onAir, [{ kind: "played", requestId: "q2" }], 0);
    expect(done.nowPlaying).toBeNull();
  });

  it("applies reorder and settings patches", () => {
    const reordered = applyPendingCommands(
      state,
      [{ kind: "reorder", sessionId: "ses_1", order: ["q2", "q1"] }],
      0,
    );
    expect(reordered.queue.map((item) => item.id)).toEqual(["q2", "q1"]);
    const closed = applyPendingCommands(
      state,
      [{ kind: "settings", sessionId: "ses_1", patch: { requestsOpen: false } }],
      0,
    );
    expect(closed.venue.settings.requestsOpen).toBe(false);
  });

  it("ignores commands for requests it does not know", () => {
    expect(applyPendingCommands(state, [{ kind: "accept", requestId: "missing" }], 0)).toEqual(
      state,
    );
  });
});

describe("list helpers", () => {
  it("moves ids without mutating the input", () => {
    const order = ["a", "b", "c", "d"];
    expect(moveId(order, 3, 0)).toEqual(["d", "a", "b", "c"]);
    expect(moveId(order, 0, 1)).toEqual(["b", "a", "c", "d"]);
    expect(moveId(order, 1, 1)).toEqual(order);
    expect(moveId(order, 1, 9)).toEqual(order);
    expect(order).toEqual(["a", "b", "c", "d"]);
    expect(reorderIds(order, "c", "a")).toEqual(["c", "a", "b", "d"]);
  });

  it("steps selection within bounds", () => {
    const ids = ["a", "b", "c"];
    expect(stepSelection(ids, null, 1)).toBe("a");
    expect(stepSelection(ids, null, -1)).toBe("c");
    expect(stepSelection(ids, "b", 1)).toBe("c");
    expect(stepSelection(ids, "c", 1)).toBe("c");
    expect(stepSelection(ids, "a", -1)).toBe("a");
    expect(stepSelection([], "a", 1)).toBeNull();
  });

  it("puts deferred requests after the fresh ones and honours a pending order", () => {
    const state = makeState({
      pending: [makeRequest("p1"), makeRequest("p2"), makeRequest("p3")],
      queue: [
        makeRequest("q1", { status: "accepted", position: 1 }),
        makeRequest("q2", { status: "accepted", position: 2 }),
      ],
    });
    const view = deriveConsoleView(state, ["p1"], ["q2", "q1"]);
    expect(view.incoming.map((item) => item.id)).toEqual(["p2", "p3"]);
    expect(view.allIncoming.map((item) => item.id)).toEqual(["p2", "p3", "p1"]);
    expect(view.queue.map((item) => item.id)).toEqual(["q2", "q1"]);
    expect(deriveConsoleView(null, [], null).queue).toEqual([]);
  });
});
