import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AbortedError,
  CircuitBreaker,
  CircuitOpenError,
  TimeoutError,
  backoffDelay,
  createLimiter,
  createSingleFlight,
  isRetryable,
  withRetry,
  withTimeout,
} from "./resilience";
import { ProviderError } from "./types";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("withTimeout", () => {
  it("resolves with the value when the call is fast enough", async () => {
    const result = await withTimeout(async () => "ok", 3000);
    expect(result).toBe("ok");
  });

  it("rejects with TimeoutError and aborts the signal after the deadline", async () => {
    let seenSignal: AbortSignal | undefined;
    const pending = withTimeout(
      (signal) =>
        new Promise<string>((resolve) => {
          seenSignal = signal;
          setTimeout(() => resolve("late"), 10_000);
        }),
      3000,
    );
    const assertion = expect(pending).rejects.toBeInstanceOf(TimeoutError);
    await vi.advanceTimersByTimeAsync(3000);
    await assertion;
    expect(seenSignal?.aborted).toBe(true);
  });

  it("rejects with AbortedError when the parent signal aborts", async () => {
    const parent = new AbortController();
    const pending = withTimeout(() => new Promise<string>(() => undefined), 3000, parent.signal);
    const assertion = expect(pending).rejects.toBeInstanceOf(AbortedError);
    parent.abort();
    await assertion;
  });

  it("rejects immediately when the parent signal is already aborted", async () => {
    const parent = new AbortController();
    parent.abort();
    await expect(withTimeout(async () => "x", 3000, parent.signal)).rejects.toBeInstanceOf(
      AbortedError,
    );
  });

  it("does not leave timers behind after success", async () => {
    await withTimeout(async () => 1, 3000);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("retry", () => {
  const options = (overrides: Partial<Parameters<typeof withRetry>[1]> = {}) => ({
    attempts: 3,
    baseDelayMs: 100,
    maxDelayMs: 400,
    random: () => 0.5,
    sleep: async () => undefined,
    ...overrides,
  });

  it("classifies retryable errors", () => {
    expect(isRetryable(new ProviderError("x", { retryable: true }))).toBe(true);
    expect(isRetryable(new ProviderError("x", { retryable: false }))).toBe(false);
    expect(isRetryable(new TypeError("fetch failed"))).toBe(true);
    expect(isRetryable(new TimeoutError())).toBe(false);
    expect(isRetryable(new CircuitOpenError())).toBe(false);
    expect(isRetryable(new AbortedError())).toBe(false);
    expect(isRetryable(new Error("boom"))).toBe(false);
  });

  it("computes exponential full-jitter delays capped at the maximum", () => {
    const base = { baseDelayMs: 100, maxDelayMs: 400 };
    expect(backoffDelay(1, { ...base, random: () => 1 })).toBe(100);
    expect(backoffDelay(2, { ...base, random: () => 1 })).toBe(200);
    expect(backoffDelay(3, { ...base, random: () => 1 })).toBe(400);
    expect(backoffDelay(4, { ...base, random: () => 1 })).toBe(400);
    expect(backoffDelay(3, { ...base, random: () => 0 })).toBe(0);
    expect(backoffDelay(2, { ...base, random: () => 0.5 })).toBe(100);
  });

  it("retries transient errors with jittered sleeps until success", async () => {
    const sleeps: number[] = [];
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new ProviderError("flaky", { retryable: true });
        return "done";
      },
      options({ sleep: async (ms) => void sleeps.push(ms) }),
    );
    expect(result).toBe("done");
    expect(calls).toBe(3);
    expect(sleeps).toEqual([50, 100]);
  });

  it("gives up after the configured attempts", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new ProviderError("always", { retryable: true });
        },
        options({ attempts: 2 }),
      ),
    ).rejects.toThrow("always");
    expect(calls).toBe(2);
  });

  it("does not retry permanent errors", async () => {
    let calls = 0;
    await expect(
      withRetry(async () => {
        calls += 1;
        throw new ProviderError("bad request", { retryable: false, status: 400 });
      }, options()),
    ).rejects.toThrow("bad request");
    expect(calls).toBe(1);
  });

  it("stops retrying when the signal is aborted", async () => {
    const controller = new AbortController();
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          controller.abort();
          throw new ProviderError("flaky", { retryable: true });
        },
        options(),
        controller.signal,
      ),
    ).rejects.toBeInstanceOf(AbortedError);
    expect(calls).toBe(1);
  });
});

describe("CircuitBreaker", () => {
  const make = (now: () => number) =>
    new CircuitBreaker({ failureThreshold: 3, cooldownMs: 30_000, now });

  it("stays closed below the failure threshold and resets on success", () => {
    let time = 0;
    const breaker = make(() => time);
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state()).toBe("closed");
    breaker.recordSuccess();
    breaker.recordFailure();
    breaker.recordFailure();
    expect(breaker.state()).toBe("closed");
    expect(breaker.consecutiveFailures).toBe(2);
    time += 1;
  });

  it("opens at the threshold and rejects until the cooldown passes", () => {
    let time = 1000;
    const breaker = make(() => time);
    for (let index = 0; index < 3; index += 1) breaker.recordFailure();
    expect(breaker.state()).toBe("open");
    expect(breaker.tryAcquire()).toBe(false);
    time += 29_999;
    expect(breaker.tryAcquire()).toBe(false);
    time += 1;
    expect(breaker.state()).toBe("half-open");
  });

  it("lets exactly one probe through when half-open and closes on success", () => {
    let time = 0;
    const breaker = make(() => time);
    for (let index = 0; index < 3; index += 1) breaker.recordFailure();
    time += 30_000;
    expect(breaker.tryAcquire()).toBe(true);
    expect(breaker.tryAcquire()).toBe(false);
    breaker.recordSuccess();
    expect(breaker.state()).toBe("closed");
    expect(breaker.tryAcquire()).toBe(true);
  });

  it("reopens immediately when the half-open probe fails", () => {
    let time = 0;
    const breaker = make(() => time);
    for (let index = 0; index < 3; index += 1) breaker.recordFailure();
    time += 30_000;
    expect(breaker.tryAcquire()).toBe(true);
    breaker.recordFailure();
    expect(breaker.state()).toBe("open");
    time += 29_999;
    expect(breaker.state()).toBe("open");
    time += 1;
    expect(breaker.state()).toBe("half-open");
  });

  it("frees the probe slot when a call ends without an outcome", () => {
    let time = 0;
    const breaker = make(() => time);
    for (let index = 0; index < 3; index += 1) breaker.recordFailure();
    time += 30_000;
    expect(breaker.tryAcquire()).toBe(true);
    breaker.releaseWithoutOutcome();
    expect(breaker.tryAcquire()).toBe(true);
  });
});

describe("createLimiter", () => {
  it("never runs more tasks than the concurrency limit", async () => {
    const limiter = createLimiter(2);
    let active = 0;
    let peak = 0;
    const task = () =>
      limiter.run(async () => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
        active -= 1;
      });
    const all = Promise.all([task(), task(), task(), task(), task()]);
    await vi.advanceTimersByTimeAsync(1000);
    await all;
    expect(peak).toBe(2);
  });
});

describe("createSingleFlight", () => {
  it("shares one in-flight promise per key and clears it afterwards", async () => {
    const flight = createSingleFlight<number>();
    let runs = 0;
    const task = async () => {
      runs += 1;
      return runs;
    };
    const [first, second] = await Promise.all([flight("a", task), flight("a", task)]);
    expect(first).toBe(1);
    expect(second).toBe(1);
    expect(await flight("a", task)).toBe(2);
    expect(await flight("b", task)).toBe(3);
  });

  it("clears the key after a failure so the next call retries", async () => {
    const flight = createSingleFlight<number>();
    await expect(flight("a", async () => Promise.reject(new Error("no")))).rejects.toThrow("no");
    expect(await flight("a", async () => 7)).toBe(7);
  });
});
