import { EventEmitter } from "node:events";
import type { Redis } from "ioredis";

export type PubSubListener = (message: string) => void;

export interface PubSub {
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, listener: PubSubListener): Promise<() => Promise<void>>;
  close(): Promise<void>;
}

export function createMemoryPubSub(): PubSub {
  const emitter = new EventEmitter();
  emitter.setMaxListeners(0);
  return {
    publish(channel, message) {
      emitter.emit(channel, message);
      return Promise.resolve();
    },
    subscribe(channel, listener) {
      emitter.on(channel, listener);
      return Promise.resolve(() => {
        emitter.off(channel, listener);
        return Promise.resolve();
      });
    },
    close() {
      emitter.removeAllListeners();
      return Promise.resolve();
    },
  };
}

export function createRedisPubSub(redis: Redis, prefix = "joymusic:pubsub:"): PubSub {
  const subscriber = redis.duplicate();
  const listeners = new Map<string, Set<PubSubListener>>();

  subscriber.on("message", (channel: string, message: string) => {
    const bucket = listeners.get(channel);
    if (!bucket) return;
    for (const listener of bucket) listener(message);
  });
  subscriber.on("error", () => undefined);

  return {
    async publish(channel, message) {
      await redis.publish(prefix + channel, message);
    },
    async subscribe(channel, listener) {
      const key = prefix + channel;
      let bucket = listeners.get(key);
      if (!bucket) {
        bucket = new Set();
        listeners.set(key, bucket);
        await subscriber.subscribe(key);
      }
      bucket.add(listener);
      return async () => {
        const current = listeners.get(key);
        if (!current) return;
        current.delete(listener);
        if (current.size === 0) {
          listeners.delete(key);
          await subscriber.unsubscribe(key);
        }
      };
    },
    async close() {
      listeners.clear();
      subscriber.disconnect();
    },
  };
}
