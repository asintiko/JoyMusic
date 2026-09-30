import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../..", import.meta.url));
const servicesScript = join(repositoryRoot, "apps/api/scripts/test-services.mjs");
const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
const database = databaseUrl.pathname.slice(1);
const port = databaseUrl.port || "54329";

function psqlBinary() {
  const root = "/usr/lib/postgresql";
  if (existsSync(root)) {
    const versions = readdirSync(root)
      .filter((entry) => existsSync(join(root, entry, "bin", "psql")))
      .sort((a, b) => Number(b) - Number(a));
    const newest = versions[0];
    if (newest) return join(root, newest, "bin", "psql");
  }
  return "psql";
}

function psql(target, statement) {
  const result = spawnSync(
    psqlBinary(),
    ["-h", "127.0.0.1", "-p", port, "-U", "joymusic", "-d", target, "-tAqc", statement],
    { encoding: "utf8", env: { ...process.env, PGPASSWORD: "joymusic" } },
  );
  if (result.status !== 0) throw new Error(`psql failed: ${result.stderr}`);
}

execFileSync(process.execPath, [servicesScript, "start"], { stdio: "ignore" });
psql("postgres", `drop database if exists ${database} with (force)`);
psql("postgres", `create database ${database}`);
for (const script of ["db:migrate", "db:seed"]) {
  execFileSync("pnpm", ["--filter", "@joymusic/api", script], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: "ignore",
  });
}
