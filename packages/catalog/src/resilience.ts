import type { BreakerState } from "./types";
import { ProviderError } from "./types";

export class TimeoutError extends Error {
  constructor(message = "Provider call timed out") {
    super(message);
    this.name = "TimeoutError";
  }
}

export class CircuitOpenError extends Error {
  constructor(message = "Circuit breaker is open") {
    super(message);
    this.name = "CircuitOpenError";
  }
}

export class AbortedError extends Error {
  constructor(message = "Aborted") {
    super(message);
    this.name = "AbortedError";
  }
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof AbortedError || error instanceof CircuitOpenError) return false;
  if (error instanceof TimeoutError) return false;
  if (error instanceof ProviderError) return error.retryable;
  return error instanceof TypeError;
}

export async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  parent?: AbortSignal,
): Promise<T> {
  if (parent?.aborted) throw new AbortedError();
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onParentAbort: (() => void) | undefined;
  const guard = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError());
    }, timeoutMs);
    if (parent) {
      onParentAbort = () => {
        controller.abort();
        reject(new AbortedError());
      };
      parent.addEventListener("abort", onParentAbort, { once: true });
    }
  });
  try {
    return await Promise.race([run(controller.signal), guard]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (parent && onParentAbort) parent.removeEventListener("abort", onParentAbort);
  }
}

export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  random: () => number;
  sleep: (ms: number) => Promise<void>;
}

export function backoffDelay(
  attempt: number,
  options: Pick<RetryOptions, "baseDelayMs" | "maxDelayMs" | "random">,
): number {
  const ceiling = Math.min(options.maxDelayMs, options.baseDelayMs * 2 ** (attempt - 1));
  return Math.floor(options.random() * ceiling);
}

export async function withRetry<T>(
  run: (attempt: number) => Promise<T>,
  options: RetryOptions,
  signal?: AbortSignal,
): Promise<T> {
  let attempt = 1;
  for (;;) {
    try {
      return await run(attempt);
    } catch (error) {
      if (signal?.aborted) throw new AbortedError();
      if (attempt >= options.attempts || !isRetryable(error)) throw error;
      await options.sleep(backoffDelay(attempt, options));
      attempt += 1;
    }
  }
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  now: () => number;
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  private probing = false;
  private readonly options: CircuitBreakerOptions;

  constructor(options: CircuitBreakerOptions) {
    this.options = options;
  }

  get consecutiveFailures(): number {
    return this.failures;
  }

  state(): BreakerState {
    if (this.openedAt === null) return "closed";
    return this.options.now() - this.openedAt >= this.options.cooldownMs ? "half-open" : "open";
  }

  tryAcquire(): boolean {
    const state = this.state();
    if (state === "closed") return true;
    if (state === "open") return false;
    if (this.probing) return false;
    this.probing = true;
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = null;
    this.probing = false;
  }

  recordFailure(): void {
    this.failures += 1;
    this.probing = false;
    if (this.openedAt !== null || this.failures >= this.options.failureThreshold) {
      this.openedAt = this.options.now();
    }
  }

  releaseWithoutOutcome(): void {
    this.probing = false;
  }
}

export interface Limiter {
  run<T>(task: () => Promise<T>): Promise<T>;
}

export function createLimiter(maxConcurrent: number): Limiter {
  let active = 0;
  const waiting: Array<() => void> = [];
  const release = () => {
    active -= 1;
    const next = waiting.shift();
    if (next) next();
  };
  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (active >= maxConcurrent) {
        await new Promise<void>((resolve) => waiting.push(resolve));
      }
      active += 1;
      try {
        return await task();
      } finally {
        release();
      }
    },
  };
}

export function createSingleFlight<T>(): (key: string, task: () => Promise<T>) => Promise<T> {
  const pending = new Map<string, Promise<T>>();
  return (key, task) => {
    const existing = pending.get(key);
    if (existing) return existing;
    const promise = task().finally(() => {
      pending.delete(key);
    });
    pending.set(key, promise);
    return promise;
  };
}
