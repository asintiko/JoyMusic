import { runMigrations } from "./migrate";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

await runMigrations(databaseUrl);
console.warn("Migrations applied");
