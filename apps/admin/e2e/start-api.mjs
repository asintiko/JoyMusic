import { spawn, spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const adminRoot = resolve(here, "..");
const repositoryRoot = resolve(adminRoot, "../..");
const port = process.env.E2E_API_PORT ?? "4321";
const origin = process.env.E2E_ADMIN_ORIGIN ?? "http://localhost:5184";
const pgPort = process.env.JOYMUSIC_TEST_PG_PORT ?? "54329";
const database = "joymusic_admin_e2e";
const adminUrl = `postgres://joymusic:joymusic@127.0.0.1:${pgPort}/postgres`;
const databaseUrl = `postgres://joymusic:joymusic@127.0.0.1:${pgPort}/${database}`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: repositoryRoot, ...options });
  if (result.status !== 0) {
    process.stderr.write(`${command} ${args.join(" ")} failed with ${result.status}\n`);
    process.exit(result.status ?? 1);
  }
}

run("node", ["apps/api/scripts/test-services.mjs", "start"]);
run("psql", [adminUrl, "-q", "-c", `drop database if exists ${database} with (force)`]);
run("psql", [adminUrl, "-q", "-c", `create database ${database}`]);

const env = {
  ...process.env,
  NODE_ENV: "development",
  DATABASE_URL: databaseUrl,
  REDIS_URL: "",
  JWT_SECRET: "admin-e2e-secret-admin-e2e-secret-1234",
  PUBLIC_WEB_URL: "http://localhost:3000",
  CORS_ORIGINS: origin,
  PORT: port,
  MIGRATE_ON_START: "true",
  JOBS_ENABLED: "false",
  LOG_LEVEL: "warn",
  RATE_LIMIT_MAX: "20000",
  RATE_LIMIT_AUTH_MAX: "2000",
  LOGIN_MAX_FAILURES: "50",
  SEED_PASSWORD: "",
};

run("pnpm", ["--filter", "@joymusic/api", "db:migrate"], { env });
run("pnpm", ["--filter", "@joymusic/api", "db:seed"], { env });
run("node", ["apps/admin/scripts/seed-activity.mjs"], { env });

const api = spawn("pnpm", ["--filter", "@joymusic/api", "exec", "tsx", "src/index.ts"], {
  stdio: "inherit",
  cwd: repositoryRoot,
  env,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => api.kill(signal));
}
api.on("exit", (code) => process.exit(code ?? 0));
