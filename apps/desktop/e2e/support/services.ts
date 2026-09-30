import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

export const repositoryRoot = resolve(import.meta.dirname, "../../../..");
export const desktopRoot = resolve(import.meta.dirname, "../..");
const apiRoot = join(repositoryRoot, "apps/api");

export interface E2eEnvironment {
  apiUrl: string;
  shimUrl: string;
  databaseUrl: string;
  djEmail: string;
  djPassword: string;
  venueSlug: string;
}

export function findPostgresBinary(name: string): string {
  const root = "/usr/lib/postgresql";
  if (existsSync(root)) {
    for (const version of readdirSync(root).sort().reverse()) {
      const candidate = join(root, version, "bin", name);
      if (existsSync(candidate)) return candidate;
    }
  }
  return name;
}

export async function waitForUrl(url: string, timeoutMs: number, label: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`${label} did not become ready: ${String(lastError)}`);
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv, cwd: string): void {
  const result = spawnSync(command, args, { cwd, env, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
}

export interface StartedServices {
  environment: E2eEnvironment;
  stop(): Promise<void>;
}

export async function startServices(options: {
  apiPort: number;
  shimPort: number;
  databaseName: string;
}): Promise<StartedServices> {
  const { apiPort, shimPort, databaseName } = options;
  run("node", [join(apiRoot, "scripts/test-services.mjs"), "start"], process.env, repositoryRoot);

  const adminUrl = "postgres://joymusic:joymusic@127.0.0.1:54329/postgres";
  const psql = findPostgresBinary("psql");
  run(
    psql,
    [adminUrl, "-c", `drop database if exists ${databaseName} with (force)`],
    process.env,
    repositoryRoot,
  );
  run(psql, [adminUrl, "-c", `create database ${databaseName}`], process.env, repositoryRoot);

  const databaseUrl = `postgres://joymusic:joymusic@127.0.0.1:54329/${databaseName}`;
  const shimOrigin = `http://127.0.0.1:${shimPort}`;
  const apiEnvironment: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "development",
    DATABASE_URL: databaseUrl,
    JWT_SECRET: "desktop-e2e-secret-desktop-e2e-secret-0123",
    PUBLIC_WEB_URL: "http://localhost:3000",
    HOST: "127.0.0.1",
    PORT: String(apiPort),
    CORS_ORIGINS: shimOrigin,
    REDIS_URL: "redis://127.0.0.1:6390",
    RATE_LIMIT_NAMESPACE: `desktope2e${apiPort}`,
    RATE_LIMIT_MAX: "100000",
    RATE_LIMIT_AUTH_MAX: "10000",
    RATE_LIMIT_REQUEST_MAX: "10000",
    LOGIN_MAX_FAILURES: "1000",
    LOG_LEVEL: "warn",
    JOBS_ENABLED: "false",
    SEED_PASSWORD: "joymusic-demo",
  };

  run("pnpm", ["exec", "tsx", "src/db/migrate-cli.ts"], apiEnvironment, apiRoot);
  run("pnpm", ["exec", "tsx", "src/db/seed.ts"], apiEnvironment, apiRoot);

  const children: ChildProcess[] = [];
  const api = spawn("pnpm", ["exec", "tsx", "src/index.ts"], {
    cwd: apiRoot,
    env: apiEnvironment,
    stdio: "ignore",
    detached: true,
  });
  children.push(api);
  const shim = spawn(
    "pnpm",
    ["exec", "vite", "--config", "vite.shim.config.ts", "--port", String(shimPort)],
    { cwd: desktopRoot, env: process.env, stdio: "ignore", detached: true },
  );
  children.push(shim);

  const stop = async () => {
    for (const child of children) {
      if (child.pid) {
        try {
          process.kill(-child.pid, "SIGTERM");
        } catch {
          child.kill("SIGTERM");
        }
      }
    }
  };

  try {
    await waitForUrl(`http://127.0.0.1:${apiPort}/v1/health`, 60_000, "API");
    await waitForUrl(`${shimOrigin}/`, 60_000, "Renderer dev server");
  } catch (error) {
    await stop();
    throw error;
  }

  return {
    environment: {
      apiUrl: `http://127.0.0.1:${apiPort}`,
      shimUrl: shimOrigin,
      databaseUrl,
      djEmail: "dj@joymusic.uz",
      djPassword: "joymusic-demo",
      venueSlug: "joy-demo-club",
    },
    stop,
  };
}
