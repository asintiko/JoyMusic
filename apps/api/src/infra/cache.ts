import type { Redis } from "ioredis";

export interface Cache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  delete(key: string): Promise<void>;
}

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const pruneThreshold = 5000;

export function createMemoryCache(now: () => number = Date.now): Cache {
  const entries = new Map<string, MemoryEntry>();

  function prune() {
    if (entries.size < pruneThreshold) return;
    const current = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= current) entries.delete(key);
    }
  }

  return {
    get(key) {
      const entry = entries.get(key);
      if (!entry) return Promise.resolve(null);
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return Promise.resolve(null);
      }
      return Promise.resolve(entry.value);
    },
    set(key, value, ttlSeconds) {
      prune();
      entries.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
      return Promise.resolve();
    },
    delete(key) {
      entries.delete(key);
      return Promise.resolve();
    },
  };
}

export function createRedisCache(redis: Redis, prefix = "joymusic:cache:"): Cache {
  return {
    get: (key) => redis.get(prefix + key),
    async set(key, value, ttlSeconds) {
      await redis.set(prefix + key, value, "EX", Math.max(1, Math.ceil(ttlSeconds)));
    },
    async delete(key) {
      await redis.del(prefix + key);
    },
  };
}
