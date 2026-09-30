import { Redis } from "ioredis";

export interface RedisLogger {
  warn(details: unknown, message: string): void;
}

export function createRedis(url: string, logger?: RedisLogger): Redis {
  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableAutoPipelining: true,
    connectTimeout: 5000,
  });
  client.on("error", (error: Error) => {
    logger?.warn({ error: error.message }, "redis connection error");
  });
  return client;
}
