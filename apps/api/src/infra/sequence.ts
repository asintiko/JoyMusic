import type { Redis } from "ioredis";

export interface SequenceStore {
  next(scope: string): Promise<number>;
  current(scope: string): Promise<number>;
}

export function createMemorySequenceStore(): SequenceStore {
  const values = new Map<string, number>();
  return {
    next(scope) {
      const value = (values.get(scope) ?? 0) + 1;
      values.set(scope, value);
      return Promise.resolve(value);
    },
    current(scope) {
      return Promise.resolve(values.get(scope) ?? 0);
    },
  };
}

export function createRedisSequenceStore(redis: Redis, prefix = "joymusic:seq:"): SequenceStore {
  return {
    next: (scope) => redis.incr(prefix + scope),
    async current(scope) {
      const value = await redis.get(prefix + scope);
      return value ? Number(value) : 0;
    },
  };
}
