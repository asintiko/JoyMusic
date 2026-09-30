import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSearchController,
  normalizeQuery,
  type SearchState,
} from "@/guest/search-controller";
import { makeTrack } from "./helpers";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function setup(
  run?: (query: string, signal: AbortSignal) => Promise<ReturnType<typeof makeTrack>[]>,
) {
  const states: SearchState[] = [];
  const runner =
    run ?? vi.fn(async (query: string) => [makeTrack({ id: `id:${query}`, title: query })]);
  const controller = createSearchController({
    run: runner,
    onChange: (state) => states.push(state),
    debounceMs: 200,
  });
  return { controller, states, runner };
}

describe("normalizeQuery", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeQuery("  Shah   zoda ")).toBe("Shah zoda");
  });
});

describe("search controller", () => {
  it("debounces keystrokes into one request", async () => {
    const { controller, runner, states } = setup();
    controller.search("sh");
    vi.advanceTimersByTime(100);
    controller.search("sha");
    vi.advanceTimersByTime(100);
    controller.search("shah");
    expect(runner).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(runner).toHaveBeenCalledTimes(1);
    expect(runner).toHaveBeenCalledWith("shah", expect.any(AbortSignal));
    expect(states.at(-1)).toMatchObject({ status: "ready", query: "shah" });
  });

  it("stays idle below the minimum length", async () => {
    const { controller, runner, states } = setup();
    controller.search("s");
    await vi.advanceTimersByTimeAsync(500);
    expect(runner).not.toHaveBeenCalled();
    expect(states.at(-1)?.status).toBe("idle");
  });

  it("aborts the in-flight request when a new query starts", async () => {
    const signals: AbortSignal[] = [];
    const run = vi.fn(
      (query: string, signal: AbortSignal) =>
        new Promise<ReturnType<typeof makeTrack>[]>((resolve) => {
          signals.push(signal);
          setTimeout(() => resolve([makeTrack({ id: query, title: query })]), 1000);
        }),
    );
    const { controller, states } = setup(run);
    controller.search("first");
    await vi.advanceTimersByTimeAsync(200);
    controller.search("second");
    expect(signals[0]?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(200);
    await vi.advanceTimersByTimeAsync(1000);
    const ready = states.filter((state) => state.status === "ready");
    expect(ready).toHaveLength(1);
    expect(ready[0]?.query).toBe("second");
  });

  it("drops results of a cancelled search", async () => {
    const run = vi.fn(
      () =>
        new Promise<ReturnType<typeof makeTrack>[]>((resolve) =>
          setTimeout(() => resolve([makeTrack()]), 500),
        ),
    );
    const { controller, states } = setup(run);
    controller.search("shahzoda");
    await vi.advanceTimersByTimeAsync(200);
    controller.cancel();
    await vi.advanceTimersByTimeAsync(1000);
    expect(states.some((state) => state.status === "ready")).toBe(false);
    expect(states.at(-1)?.status).toBe("idle");
  });

  it("reports errors and retries", async () => {
    const run = vi
      .fn()
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValueOnce([makeTrack()]);
    const { controller, states } = setup(run);
    controller.search("shahzoda");
    await vi.advanceTimersByTimeAsync(200);
    expect(states.at(-1)?.status).toBe("error");
    controller.retry();
    await vi.advanceTimersByTimeAsync(0);
    expect(states.at(-1)?.status).toBe("ready");
  });

  it("serves repeated queries from the cache", async () => {
    const { controller, runner } = setup();
    controller.search("shahzoda");
    await vi.advanceTimersByTimeAsync(200);
    controller.search("SHAHZODA");
    await vi.advanceTimersByTimeAsync(200);
    expect(runner).toHaveBeenCalledTimes(1);
  });

  it("keeps the previous results visible while loading", async () => {
    const { controller, states } = setup();
    controller.search("shahzoda");
    await vi.advanceTimersByTimeAsync(200);
    controller.search("shahzoda x");
    const loading = states.at(-1);
    expect(loading?.status).toBe("loading");
    expect(loading?.tracks).toHaveLength(1);
  });
});
