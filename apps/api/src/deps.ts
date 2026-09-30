import type { Redis } from "ioredis";
import type { Config } from "./config";
import { createDatabase, type Database } from "./db/client";
import { createMemoryCache, createRedisCache, type Cache } from "./infra/cache";
import {
  createMemoryCounterStore,
  createRedisCounterStore,
  type CounterStore,
} from "./infra/counter-store";
import { createMemoryPubSub, createRedisPubSub, type PubSub } from "./infra/pubsub";
import { createRedis } from "./infra/redis";
import { createGoogleVerifier, type GoogleVerifier } from "./modules/auth/google";
import { createPasswordHasher, type PasswordHasher } from "./modules/auth/password";
import { createTokenService, type TokenService } from "./modules/auth/tokens";
import { noopVenuePublisher, type VenuePublisher } from "./realtime/publisher";

export interface Deps {
  config: Config;
  db: Database;
  redis: Redis | null;
  cache: Cache;
  pubsub: PubSub;
  counters: CounterStore;
  publisher: VenuePublisher;
  passwords: PasswordHasher;
  tokens: TokenService;
  google: GoogleVerifier;
  close(): Promise<void>;
}

export type DepsOverrides = Partial<Omit<Deps, "config" | "close">>;

export function createDeps(config: Config, overrides: DepsOverrides = {}): Deps {
  const database = overrides.db
    ? null
    : createDatabase(config.databaseUrl, { maxConnections: config.databasePoolMax });
  const db = overrides.db ?? database?.db;
  if (!db) throw new Error("Database is not available");
  const redis =
    overrides.redis === undefined && config.redisUrl
      ? createRedis(config.redisUrl)
      : (overrides.redis ?? null);
  const pubsub = overrides.pubsub ?? (redis ? createRedisPubSub(redis) : createMemoryPubSub());
  return {
    config,
    db,
    redis,
    cache: overrides.cache ?? (redis ? createRedisCache(redis) : createMemoryCache()),
    pubsub,
    counters:
      overrides.counters ?? (redis ? createRedisCounterStore(redis) : createMemoryCounterStore()),
    publisher: overrides.publisher ?? noopVenuePublisher,
    passwords: overrides.passwords ?? createPasswordHasher(config.isTest ? "fast" : "standard"),
    tokens: overrides.tokens ?? createTokenService(config.jwtSecret),
    google: overrides.google ?? createGoogleVerifier({ clientId: config.googleClientId }),
    async close() {
      await pubsub.close();
      if (redis && overrides.redis === undefined) redis.disconnect();
      if (database) await database.close();
    },
  };
}
