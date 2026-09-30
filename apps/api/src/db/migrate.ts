import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const migrationLockKey = 727_274_001;

export function resolveMigrationsFolder(): string {
  let directory = dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 5; depth += 1) {
    const candidate = join(directory, "drizzle");
    if (existsSync(join(candidate, "meta", "_journal.json"))) return candidate;
    directory = dirname(directory);
  }
  throw new Error("Drizzle migrations folder was not found");
}

export async function runMigrations(databaseUrl: string): Promise<void> {
  const client = postgres(databaseUrl, { max: 1, onnotice: () => undefined });
  try {
    await client`select pg_advisory_lock(${migrationLockKey})`;
    try {
      await migrate(drizzle(client), { migrationsFolder: resolveMigrationsFolder() });
    } finally {
      await client`select pg_advisory_unlock(${migrationLockKey})`;
    }
  } finally {
    await client.end({ timeout: 5 });
  }
}
