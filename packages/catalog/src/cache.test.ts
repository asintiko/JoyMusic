import { describe, expect, it } from "vitest";
import { createMemoryCache, createRedisCache } from "./cache";
import type { RedisLike } from "./cache";

describe("memory cache", () => {
  it("stores and returns values until the ttl elapses", async () => {
    let time = 1000;
    const cache = createMemoryCache({ now: () => time });
    await cache.set("k", { a: 1 }, 5000);
    expect(await cache.get("k")).toEqual({ a: 1 });
    time += 4999;
    expect(await cache.get("k")).toEqual({ a: 1 });
    time += 1;
    expect(await cache.get("k")).toBeUndefined();
  });

  it("returns clones so callers cannot mutate cached data", async () => {
    const cache = createMemoryCache();
    await cache.set("k", { list: [1, 2] }, 1000);
    const first = await cache.get<{ list: number[] }>("k");
    first?.list.push(3);
    expect(await cache.get("k")).toEqual({ list: [1, 2] });
  });

  it("evicts the least recently used entry beyond capacity", async () => {
    const cache = createMemoryCache({ maxEntries: 2 });
    await cache.set("a", 1, 10_000);
    await cache.set("b", 2, 10_000);
    await cache.get("a");
    await cache.set("c", 3, 10_000);
    expect(await cache.get("a")).toBe(1);
    expect(await cache.get("b")).toBeUndefined();
    expect(await cache.get("c")).toBe(3);
  });

  it("prefers evicting expired entries and supports delete", async () => {
    let time = 0;
    const cache = createMemoryCache({ maxEntries: 2, now: () => time });
    await cache.set("old", 1, 10);
    await cache.set("keep", 2, 10_000);
    time = 100;
    await cache.set("new", 3, 10_000);
    expect(await cache.get("keep")).toBe(2);
    expect(await cache.get("new")).toBe(3);
    await cache.delete("new");
    expect(await cache.get("new")).toBeUndefined();
  });

  it("ignores writes with a non-positive ttl", async () => {
    const cache = createMemoryCache();
    await cache.set("k", 1, 0);
    expect(await cache.get("k")).toBeUndefined();
  });
});

function createFakeRedis(): RedisLike & { store: Map<string, { value: string; ttl: number }> } {
  const store = new Map<string, { value: string; ttl: number }>();
  return {
    store,
    async get(key) {
      return store.get(key)?.value ?? null;
    },
    async set(key, value, _mode, ttlMs) {
      store.set(key, { value, ttl: ttlMs });
      return "OK";
    },
    async del(key) {
      store.delete(key);
      return 1;
    },
  };
}

describe("redis cache adapter", () => {
  it("serializes json with a prefix and millisecond ttl", async () => {
    const redis = createFakeRedis();
    const cache = createRedisCache(redis, { prefix: "t:" });
    await cache.set("k", { a: [1, 2] }, 1234.2);
    expect(redis.store.get("t:k")).toEqual({ value: '{"a":[1,2]}', ttl: 1235 });
    expect(await cache.get("k")).toEqual({ a: [1, 2] });
    await cache.delete("k");
    expect(await cache.get("k")).toBeUndefined();
  });

  it("drops corrupt entries instead of throwing", async () => {
    const redis = createFakeRedis();
    redis.store.set("joymusic:catalog:bad", { value: "{oops", ttl: 1 });
    const cache = createRedisCache(redis);
    expect(await cache.get("bad")).toBeUndefined();
    expect(redis.store.has("joymusic:catalog:bad")).toBe(false);
  });

  it("is structurally compatible with an ioredis-shaped client", async () => {
    interface IoRedisShape {
      get(key: string): Promise<string | null>;
      set(
        key: string,
        value: string | number,
        secondsToken: "EX",
        seconds: number | string,
      ): Promise<"OK">;
      set(
        key: string,
        value: string | number,
        milliseconds: "PX",
        ms: number | string,
      ): Promise<"OK">;
      del(...keys: string[]): Promise<number>;
    }
    const client: IoRedisShape = {
      get: async () => null,
      set: async () => "OK",
      del: async () => 0,
    };
    const cache = createRedisCache(client);
    await cache.set("k", 1, 1000);
    expect(await cache.get("k")).toBeUndefined();
  });

  it("skips writes with a non-positive ttl", async () => {
    const redis = createFakeRedis();
    await createRedisCache(redis).set("k", 1, 0);
    expect(redis.store.size).toBe(0);
  });
});
