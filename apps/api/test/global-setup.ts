import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { runMigrations } from "../src/db/migrate";

const servicesScript = fileURLToPath(new URL("../scripts/test-services.mjs", import.meta.url));

export default async function setup() {
  const needsPostgres = !process.env.DATABASE_URL;
  const needsRedis = !process.env.REDIS_URL;
  if (needsPostgres || needsRedis) {
    const args = [servicesScript, "start", "--json"];
    if (!needsPostgres) args.push("--skip-postgres");
    if (!needsRedis) args.push("--skip-redis");
    const output = execFileSync(process.execPath, args, { encoding: "utf8" });
    const environment = JSON.parse(output) as Record<string, string | undefined>;
    if (needsPostgres) process.env.DATABASE_URL = environment.DATABASE_URL;
    if (needsRedis && environment.REDIS_URL) process.env.REDIS_URL = environment.REDIS_URL;
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not available for tests");
  await runMigrations(databaseUrl);
}
