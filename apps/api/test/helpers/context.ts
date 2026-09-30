import { randomBytes } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { vi } from "vitest";
import { buildApp, type BuildAppOptions } from "../../src/app";
import { loadConfig, type Config } from "../../src/config";
import { createDeps, type Deps, type DepsOverrides } from "../../src/deps";
import type { VenuePublisher } from "../../src/realtime/publisher";

export function uniq(prefix = "t"): string {
  return `${prefix}${randomBytes(5).toString("hex")}`;
}

export function testEnvironment(overrides: Record<string, string | undefined> = {}) {
  return {
    ...process.env,
    NODE_ENV: "test",
    LOG_LEVEL: "silent",
    JWT_SECRET: "test-jwt-secret-test-jwt-secret-1234567890",
    PUBLIC_WEB_URL: "https://joymusic.test",
    CORS_ORIGINS: "https://admin.joymusic.test",
    DATABASE_POOL_MAX: "4",
    RATE_LIMIT_MAX: "100000",
    RATE_LIMIT_AUTH_MAX: "100000",
    RATE_LIMIT_NAMESPACE: uniq("ns"),
    ...overrides,
  };
}

export interface TestContext {
  app: FastifyInstance;
  deps: Deps;
  config: Config;
  publisher: VenuePublisher & { publish: ReturnType<typeof vi.fn> };
  close(): Promise<void>;
}

export interface TestContextOptions {
  env?: Record<string, string | undefined>;
  deps?: DepsOverrides;
  app?: BuildAppOptions;
  configure?: (app: FastifyInstance) => void | Promise<void>;
}

export async function createTestContext(options: TestContextOptions = {}): Promise<TestContext> {
  const config = loadConfig(testEnvironment(options.env));
  const publisher = { publish: vi.fn(() => Promise.resolve()) };
  const deps = createDeps(config, { publisher, ...options.deps });
  const app = await buildApp(deps, options.app);
  await options.configure?.(app);
  await app.ready();
  return {
    app,
    deps,
    config,
    publisher,
    async close() {
      await app.close();
      await deps.close();
    },
  };
}
