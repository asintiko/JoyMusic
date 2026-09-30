import type { Redis } from "ioredis";

export interface CounterState {
  count: number;
  retryAfterMs: number;
}

export interface CounterStore {
  increment(key: string, windowMs: number): Promise<CounterState>;
  read(key: string): Promise<CounterState>;
  reset(key: string): Promise<void>;
}

interface MemoryEntry {
  count: number;
  expiresAt: number;
}

const pruneThreshold = 5000;

export function createMemoryCounterStore(now: () => number = Date.now): CounterStore {
  const entries = new Map<string, MemoryEntry>();

  function prune() {
    if (entries.size < pruneThreshold) return;
    const current = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= current) entries.delete(key);
    }
  }

  function live(key: string): MemoryEntry | undefined {
    const entry = entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  }

  return {
    increment(key, windowMs) {
      prune();
      const existing = live(key);
      const entry = existing ?? { count: 0, expiresAt: now() + windowMs };
      entry.count += 1;
      entries.set(key, entry);
      return Promise.resolve({ count: entry.count, retryAfterMs: entry.expiresAt - now() });
    },
    read(key) {
      const entry = live(key);
      return Promise.resolve(
        entry
          ? { count: entry.count, retryAfterMs: entry.expiresAt - now() }
          : { count: 0, retryAfterMs: 0 },
      );
    },
    reset(key) {
      entries.delete(key);
      return Promise.resolve();
    },
  };
}

const incrementScript = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return {count, redis.call('PTTL', KEYS[1])}
`;

export function createRedisCounterStore(redis: Redis, prefix = "joymusic:counter:"): CounterStore {
  return {
    async increment(key, windowMs) {
      const [count, ttl] = (await redis.eval(incrementScript, 1, prefix + key, windowMs)) as [
        number,
        number,
      ];
      return { count, retryAfterMs: Math.max(ttl, 0) };
    },
    async read(key) {
      const [value, ttl] = await Promise.all([redis.get(prefix + key), redis.pttl(prefix + key)]);
      return { count: value ? Number(value) : 0, retryAfterMs: Math.max(ttl, 0) };
    },
    async reset(key) {
      await redis.del(prefix + key);
    },
  };
}
