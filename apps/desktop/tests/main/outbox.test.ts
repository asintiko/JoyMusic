import { describe, expect, it } from "vitest";
import type { OutboxCommand } from "../../src/common/commands";
import { classifyFailure } from "../../src/core/commands-service";
import { NetworkFailure } from "../../src/core/errors";
import { createOutbox } from "../../src/core/outbox";
import type { FailureClass } from "../../src/core/outbox";
import { ApiError } from "@joymusic/shared";

function setup(
  options: { execute?: (command: OutboxCommand) => Promise<void>; initial?: string } = {},
) {
  const executed: OutboxCommand[] = [];
  let stored: string | null = options.initial ?? null;
  let clock = 1_000;
  let counter = 0;
  const outbox = createOutbox({
    load: async () => stored,
    save: async (text) => {
      stored = text;
    },
    execute:
      options.execute ??
      (async (command) => {
        executed.push(command);
      }),
    classify: classifyFailure,
    now: () => clock,
    createId: () => `entry-${++counter}`,
  });
  return {
    outbox,
    executed,
    stored: () => stored,
    tick(ms: number) {
      clock += ms;
    },
  };
}

const accept = (id: string): OutboxCommand => ({ kind: "accept", requestId: id });

describe("outbox", () => {
  it("replays commands in the order they were queued", async () => {
    const { outbox, executed } = setup();
    await outbox.enqueue(accept("a"));
    await outbox.enqueue({ kind: "play", requestId: "a" });
    await outbox.enqueue(accept("b"));
    const result = await outbox.flush();
    expect(result).toEqual({ sent: 3, dropped: 0, stopped: null });
    expect(executed.map((command) => command.kind)).toEqual(["accept", "play", "accept"]);
    expect(outbox.size()).toBe(0);
  });

  it("stops at the first network failure and keeps everything for the next attempt", async () => {
    let online = false;
    const seen: string[] = [];
    const { outbox } = setup({
      execute: async (command) => {
        if (!online) throw new NetworkFailure();
        seen.push(command.kind);
      },
    });
    await outbox.enqueue(accept("a"));
    await outbox.enqueue(accept("b"));
    expect(await outbox.flush()).toEqual({ sent: 0, dropped: 0, stopped: "offline" });
    expect(outbox.size()).toBe(2);
    expect(outbox.topic.get().entries[0]?.attempts).toBe(1);
    online = true;
    expect(await outbox.flush()).toEqual({ sent: 2, dropped: 0, stopped: null });
    expect(seen).toEqual(["accept", "accept"]);
  });

  it("persists to disk and restores after a restart", async () => {
    const first = setup();
    await first.outbox.enqueue(accept("a"));
    await first.outbox.enqueue({ kind: "reorder", sessionId: "s1", order: ["a", "b"] });
    const restored = setup({ initial: first.stored() ?? "" });
    await restored.outbox.init();
    expect(restored.outbox.size()).toBe(2);
    await restored.outbox.flush();
    expect(restored.executed.map((command) => command.kind)).toEqual(["accept", "reorder"]);
  });

  it("ignores a corrupt file", async () => {
    const { outbox } = setup({ initial: "{not json" });
    await outbox.init();
    expect(outbox.size()).toBe(0);
    const invalid = setup({ initial: JSON.stringify({ version: 1, entries: [{ id: 1 }] }) });
    await invalid.outbox.init();
    expect(invalid.outbox.size()).toBe(0);
  });

  it("keeps only the latest reorder per session", async () => {
    const { outbox } = setup();
    await outbox.enqueue({ kind: "reorder", sessionId: "s1", order: ["a", "b", "c"] });
    await outbox.enqueue(accept("x"));
    await outbox.enqueue({ kind: "reorder", sessionId: "s1", order: ["c", "b", "a"] });
    await outbox.enqueue({ kind: "reorder", sessionId: "s2", order: ["z"] });
    const commands = outbox.commands();
    expect(commands.filter((command) => command.kind === "reorder")).toEqual([
      { kind: "reorder", sessionId: "s1", order: ["c", "b", "a"] },
      { kind: "reorder", sessionId: "s2", order: ["z"] },
    ]);
  });

  it("collapses now playing updates into the newest one", async () => {
    const { outbox } = setup();
    const input = (title: string) => ({ title, artist: "A", source: "manual" as const });
    await outbox.enqueue({ kind: "nowplaying.set", sessionId: "s1", input: input("One") });
    await outbox.enqueue({ kind: "nowplaying.set", sessionId: "s1", input: input("Two") });
    await outbox.enqueue({ kind: "nowplaying.clear", sessionId: "s1" });
    expect(outbox.commands()).toEqual([{ kind: "nowplaying.clear", sessionId: "s1" }]);
  });

  it("drops commands the server rejects as stale and reports why", async () => {
    const { outbox } = setup({
      execute: async (command) => {
        if (command.kind === "accept" && command.requestId === "gone") {
          throw new ApiError(409, "conflict", "Request already accepted");
        }
      },
    });
    await outbox.enqueue(accept("gone"));
    await outbox.enqueue(accept("fine"));
    const result = await outbox.flush();
    expect(result).toEqual({ sent: 1, dropped: 1, stopped: null });
    expect(outbox.topic.get().lastSkipped?.kind).toBe("accept");
    expect(outbox.topic.get().lastSkipped?.reason).toBe("Request already accepted");
  });

  it("halts on an authorization failure without losing the queue", async () => {
    const { outbox } = setup({
      execute: async () => {
        throw new ApiError(401, "unauthorized", "Expired");
      },
    });
    await outbox.enqueue(accept("a"));
    expect(await outbox.flush()).toEqual({ sent: 0, dropped: 0, stopped: "halted" });
    expect(outbox.size()).toBe(1);
  });

  it("expires very old entries", async () => {
    const { outbox, executed, tick } = setup();
    await outbox.enqueue(accept("old"));
    tick(7 * 60 * 60_000);
    await outbox.enqueue(accept("fresh"));
    const result = await outbox.flush();
    expect(result.dropped).toBe(1);
    expect(executed).toEqual([accept("fresh")]);
    expect(outbox.topic.get().lastSkipped?.reason).toBe("expired");
  });

  it("shares one flush between concurrent callers", async () => {
    let calls = 0;
    const { outbox } = setup({
      execute: async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 5));
      },
    });
    await outbox.enqueue(accept("a"));
    const [left, right] = await Promise.all([outbox.flush(), outbox.flush()]);
    expect(left).toBe(right);
    expect(calls).toBe(1);
  });

  it("classifies failures", () => {
    const expectations: [unknown, FailureClass][] = [
      [new NetworkFailure(), "retry"],
      [new ApiError(503, "internal", "down"), "retry"],
      [new ApiError(429, "rate_limited", "slow"), "retry"],
      [new ApiError(401, "unauthorized", "no"), "halt"],
      [new ApiError(404, "not_found", "gone"), "drop"],
      [new ApiError(409, "conflict", "changed"), "drop"],
      [new ApiError(422, "content_blocked", "no"), "drop"],
      [new Error("boom"), "drop"],
    ];
    for (const [error, expected] of expectations) expect(classifyFailure(error)).toBe(expected);
  });
});
