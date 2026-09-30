import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const baseDirectory = process.env.JOYMUSIC_TEST_SERVICES_DIR ?? "/tmp/joymusic-test-services";
const postgresPort = Number(process.env.JOYMUSIC_TEST_PG_PORT ?? 54329);
const redisPort = Number(process.env.JOYMUSIC_TEST_REDIS_PORT ?? 6390);
const databaseUser = "joymusic";
const databasePassword = "joymusic";
const databaseNames = ["joymusic_test", "joymusic_dev"];
const fallbackServiceUser = "joymusic-pg";

const postgresDirectory = join(baseDirectory, "postgres");
const socketDirectory = join(baseDirectory, "socket");
const redisDirectory = join(baseDirectory, "redis");
const lockDirectory = join(baseDirectory, "lock");

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function run(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", ...options });
}

function commandExists(command) {
  return run("which", [command]).status === 0;
}

function findPostgresBinaries() {
  const root = "/usr/lib/postgresql";
  if (existsSync(root)) {
    const versions = readdirSync(root)
      .filter((entry) => existsSync(join(root, entry, "bin", "pg_ctl")))
      .sort((a, b) => Number(b) - Number(a));
    const newest = versions[0];
    if (newest) return join(root, newest, "bin");
  }
  if (commandExists("pg_ctl") && commandExists("initdb")) return "";
  return null;
}

function binary(directory, name) {
  return directory ? join(directory, name) : name;
}

function databaseUrl(name) {
  return `postgres://${databaseUser}:${databasePassword}@127.0.0.1:${postgresPort}/${name}`;
}

function redisUrl() {
  return `redis://127.0.0.1:${redisPort}`;
}

function withLock(action) {
  mkdirSync(baseDirectory, { recursive: true, mode: 0o755 });
  chmodSync(baseDirectory, 0o755);
  const deadline = Date.now() + 120_000;
  for (;;) {
    try {
      mkdirSync(lockDirectory);
      break;
    } catch {
      try {
        if (Date.now() - statSync(lockDirectory).mtimeMs > 180_000) {
          rmSync(lockDirectory, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue;
      }
      if (Date.now() > deadline) throw new Error("Timed out waiting for the test services lock");
      sleep(200);
    }
  }
  try {
    return action();
  } finally {
    rmSync(lockDirectory, { recursive: true, force: true });
  }
}

function postgresIsReady(binDirectory) {
  const result = run(binary(binDirectory, "pg_isready"), [
    "-h",
    "127.0.0.1",
    "-p",
    String(postgresPort),
  ]);
  return result.status === 0;
}

function resolveServiceUser() {
  if (typeof process.getuid !== "function" || process.getuid() !== 0) return null;
  if (run("id", ["-u", "postgres"]).status === 0) return "postgres";
  if (run("id", ["-u", fallbackServiceUser]).status !== 0) {
    const created = run("useradd", [
      "--system",
      "--no-create-home",
      "--shell",
      "/usr/sbin/nologin",
      fallbackServiceUser,
    ]);
    if (created.status !== 0) {
      throw new Error(`Cannot create service user: ${created.stderr}`);
    }
  }
  return fallbackServiceUser;
}

function asUser(serviceUser, command, args) {
  if (!serviceUser) return { command, args };
  return { command: "runuser", args: ["-u", serviceUser, "--", command, ...args] };
}

function runAsUser(serviceUser, command, args, options = {}) {
  const wrapped = asUser(serviceUser, command, args);
  return run(wrapped.command, wrapped.args, options);
}

function psql(binDirectory, database, statement) {
  return run(
    binary(binDirectory, "psql"),
    [
      "-h",
      "127.0.0.1",
      "-p",
      String(postgresPort),
      "-U",
      databaseUser,
      "-d",
      database,
      "-tAqc",
      statement,
    ],
    { env: { ...process.env, PGPASSWORD: databasePassword } },
  );
}

function startPostgres() {
  const binDirectory = findPostgresBinaries();
  if (binDirectory === null) throw new Error("PostgreSQL server binaries were not found");
  if (postgresIsReady(binDirectory)) {
    ensureDatabases(binDirectory);
    return false;
  }
  const serviceUser = resolveServiceUser();
  mkdirSync(postgresDirectory, { recursive: true });
  mkdirSync(socketDirectory, { recursive: true });
  if (serviceUser) {
    run("chown", ["-R", `${serviceUser}:`, postgresDirectory, socketDirectory]);
  }
  if (!existsSync(join(postgresDirectory, "PG_VERSION"))) {
    const passwordFile = join(baseDirectory, "pg-password");
    writeFileSync(passwordFile, `${databasePassword}\n`, { mode: 0o644 });
    const init = runAsUser(serviceUser, binary(binDirectory, "initdb"), [
      "-D",
      postgresDirectory,
      "-U",
      databaseUser,
      "--auth=scram-sha-256",
      `--pwfile=${passwordFile}`,
      "-E",
      "UTF8",
      "--locale=C.UTF-8",
    ]);
    rmSync(passwordFile, { force: true });
    if (init.status !== 0) throw new Error(`initdb failed: ${init.stderr}${init.stdout}`);
  }
  const options = [
    `-p ${postgresPort}`,
    `-k ${socketDirectory}`,
    "-c listen_addresses=127.0.0.1",
    "-c fsync=off",
    "-c synchronous_commit=off",
    "-c full_page_writes=off",
    "-c max_connections=300",
    "-c shared_buffers=128MB",
  ].join(" ");
  const start = runAsUser(serviceUser, binary(binDirectory, "pg_ctl"), [
    "-D",
    postgresDirectory,
    "-l",
    join(postgresDirectory, "server.log"),
    "-w",
    "-t",
    "60",
    "-o",
    options,
    "start",
  ]);
  if (start.status !== 0) {
    const log = run("tail", ["-n", "40", join(postgresDirectory, "server.log")]).stdout;
    throw new Error(`pg_ctl start failed: ${start.stderr}${start.stdout}\n${log}`);
  }
  ensureDatabases(binDirectory);
  return true;
}

function ensureDatabases(binDirectory) {
  for (const name of databaseNames) {
    const exists = psql(
      binDirectory,
      "postgres",
      `select 1 from pg_database where datname='${name}'`,
    );
    if (exists.stdout.trim() === "1") continue;
    const created = psql(binDirectory, "postgres", `create database ${name}`);
    if (created.status !== 0 && !created.stderr.includes("already exists")) {
      throw new Error(`Cannot create database ${name}: ${created.stderr}`);
    }
  }
}

function redisIsReady() {
  const result = run("redis-cli", ["-h", "127.0.0.1", "-p", String(redisPort), "ping"]);
  return result.status === 0 && result.stdout.trim() === "PONG";
}

function startRedis() {
  if (!commandExists("redis-server")) return null;
  if (redisIsReady()) return false;
  mkdirSync(redisDirectory, { recursive: true });
  const start = run("redis-server", [
    "--port",
    String(redisPort),
    "--bind",
    "127.0.0.1",
    "--save",
    "",
    "--appendonly",
    "no",
    "--daemonize",
    "yes",
    "--dir",
    redisDirectory,
    "--pidfile",
    join(redisDirectory, "redis.pid"),
    "--logfile",
    join(redisDirectory, "redis.log"),
  ]);
  if (start.status !== 0) throw new Error(`redis-server failed: ${start.stderr}${start.stdout}`);
  const deadline = Date.now() + 15_000;
  while (!redisIsReady()) {
    if (Date.now() > deadline) throw new Error("redis-server did not become ready");
    sleep(100);
  }
  return true;
}

export function startServices({ postgres = true, redis = true } = {}) {
  return withLock(() => {
    const started = [];
    const environment = {};
    if (postgres) {
      if (startPostgres()) started.push("postgres");
      environment.DATABASE_URL = databaseUrl("joymusic_test");
      environment.DEV_DATABASE_URL = databaseUrl("joymusic_dev");
    }
    if (redis) {
      const redisStarted = startRedis();
      if (redisStarted === true) started.push("redis");
      if (redisStarted !== null) environment.REDIS_URL = redisUrl();
    }
    return { environment, started };
  });
}

export function stopServices() {
  return withLock(() => {
    const stopped = [];
    const binDirectory = findPostgresBinaries();
    if (binDirectory !== null && existsSync(join(postgresDirectory, "PG_VERSION"))) {
      if (postgresIsReady(binDirectory)) {
        const serviceUser = resolveServiceUser();
        runAsUser(serviceUser, binary(binDirectory, "pg_ctl"), [
          "-D",
          postgresDirectory,
          "-m",
          "fast",
          "-w",
          "stop",
        ]);
        stopped.push("postgres");
      }
    }
    if (commandExists("redis-cli") && redisIsReady()) {
      run("redis-cli", ["-h", "127.0.0.1", "-p", String(redisPort), "shutdown", "nosave"]);
      stopped.push("redis");
    }
    return stopped;
  });
}

function main() {
  const [command = "start", ...flags] = process.argv.slice(2);
  const json = flags.includes("--json");
  const options = {
    postgres: !flags.includes("--skip-postgres"),
    redis: !flags.includes("--skip-redis"),
  };
  if (command === "start" || command === "env") {
    const { environment, started } = startServices(options);
    if (json) {
      process.stdout.write(`${JSON.stringify({ ...environment, started })}\n`);
      return;
    }
    for (const [key, value] of Object.entries(environment)) {
      process.stdout.write(`export ${key}=${value}\n`);
    }
    if (started.length > 0) process.stderr.write(`started: ${started.join(", ")}\n`);
    return;
  }
  if (command === "stop") {
    const stopped = stopServices();
    process.stderr.write(`stopped: ${stopped.join(", ") || "nothing"}\n`);
    return;
  }
  process.stderr.write(
    "usage: test-services.mjs start|env|stop [--json] [--skip-postgres] [--skip-redis]\n",
  );
  process.exit(2);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
