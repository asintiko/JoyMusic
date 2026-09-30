import type { CatalogCache } from "./types";

export interface MemoryCacheOptions {
  maxEntries?: number;
  now?: () => number;
}

interface MemoryEntry {
  value: unknown;
  expiresAt: number;
}

export function createMemoryCache(options: MemoryCacheOptions = {}): CatalogCache {
  const maxEntries = options.maxEntries ?? 500;
  const now = options.now ?? Date.now;
  const entries = new Map<string, MemoryEntry>();

  const evictExpired = () => {
    const current = now();
    for (const [key, entry] of entries) {
      if (entry.expiresAt <= current) entries.delete(key);
    }
  };

  return {
    async get<T>(key: string): Promise<T | undefined> {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= now()) {
        entries.delete(key);
        return undefined;
      }
      entries.delete(key);
      entries.set(key, entry);
      return structuredClone(entry.value) as T;
    },
    async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
      if (ttlMs <= 0) {
        entries.delete(key);
        return;
      }
      entries.delete(key);
      entries.set(key, { value: structuredClone(value), expiresAt: now() + ttlMs });
      if (entries.size > maxEntries) {
        evictExpired();
        while (entries.size > maxEntries) {
          const oldest = entries.keys().next();
          if (oldest.done) break;
          entries.delete(oldest.value);
        }
      }
    },
    async delete(key: string): Promise<void> {
      entries.delete(key);
    },
  };
}

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "PX", ttlMs: number): Promise<unknown>;
  del(key: string): Promise<unknown>;
}

export interface RedisCacheOptions {
  prefix?: string;
}

export function createRedisCache(redis: RedisLike, options: RedisCacheOptions = {}): CatalogCache {
  const prefix = options.prefix ?? "joymusic:catalog:";
  return {
    async get<T>(key: string): Promise<T | undefined> {
      const raw = await redis.get(prefix + key);
      if (raw === null) return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch {
        await redis.del(prefix + key);
        return undefined;
      }
    },
    async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
      if (ttlMs <= 0) return;
      await redis.set(prefix + key, JSON.stringify(value), "PX", Math.ceil(ttlMs));
    },
    async delete(key: string): Promise<void> {
      await redis.del(prefix + key);
    },
  };
}
