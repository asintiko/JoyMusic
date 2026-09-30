import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import type { Writable } from "node:stream";
import type { Config } from "./config";
import type { Deps } from "./deps";
import { AppError } from "./errors";
import { installErrorHandling } from "./http/error-handler";
import { appModules } from "./modules";

export interface BuildAppOptions {
  logStream?: Writable;
}

export const redactedLogPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
  "*.password",
  "*.refreshToken",
  "*.idToken",
  "*.codeVerifier",
];

export function buildLoggerOptions(
  config: Config,
  stream?: Writable,
): NonNullable<FastifyServerOptions["logger"]> {
  const pretty = config.nodeEnv === "development" && Boolean(process.stdout.isTTY) && !stream;
  return {
    level: config.logLevel,
    redact: { paths: redactedLogPaths, censor: "[redacted]" },
    ...(stream ? { stream } : {}),
    ...(pretty
      ? {
          transport: {
            target: "pino-pretty",
            options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
          },
        }
      : {}),
  };
}

export async function buildApp(
  deps: Deps,
  options: BuildAppOptions = {},
): Promise<FastifyInstance> {
  const { config } = deps;
  const app = Fastify({
    logger: buildLoggerOptions(config, options.logStream),
    trustProxy: config.trustProxy,
    requestIdHeader: "x-request-id",
  });

  app.decorate("deps", deps);
  app.decorateRequest("user", null);
  app.decorateRequest("guest", null);
  app.decorateRequest("org", null);

  deps.redis?.on("error", (error: Error) => {
    app.log.warn({ error: error.message }, "redis connection error");
  });

  installErrorHandling(app);

  await app.register(helmet, { crossOriginResourcePolicy: { policy: "cross-origin" } });
  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["authorization", "content-type", "x-organization-id", "x-request-id"],
    exposedHeaders: ["retry-after", "x-request-id"],
    maxAge: 86_400,
  });
  await app.register(rateLimit, {
    global: true,
    max: config.rateLimit.globalMax,
    timeWindow: "1 minute",
    nameSpace: `${config.rateLimit.namespace}:`,
    skipOnError: true,
    ...(deps.redis ? { redis: deps.redis } : {}),
    errorResponseBuilder: (_request, context) =>
      new AppError("rate_limited", 429, "Too many requests, slow down", {
        details: { retryAfterSeconds: Math.max(1, Math.ceil(context.ttl / 1000)) },
      }),
  });

  app.addHook("onSend", async (_request, reply) => {
    if (!reply.hasHeader("cache-control")) reply.header("cache-control", "no-store");
  });

  for (const module of appModules) await app.register(module);

  return app;
}
