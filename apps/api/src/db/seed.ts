import { createPasswordHasher } from "../modules/auth/password";
import { createDatabase } from "./client";
import { demoDjEmail, demoOwnerEmail, demoVenueSlug, runSeed } from "./seed-runner";

const defaultDevelopmentPassword = "joymusic-demo";
const minimumPasswordLength = 8;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const configuredPassword = process.env.SEED_PASSWORD?.trim();
const password =
  configuredPassword ||
  (process.env.NODE_ENV === "production" ? undefined : defaultDevelopmentPassword);
if (!password || password.length < minimumPasswordLength) {
  console.error(
    `SEED_PASSWORD is required in production and must be at least ${minimumPasswordLength} characters`,
  );
  process.exit(1);
}

const database = createDatabase(databaseUrl, { maxConnections: 2 });
try {
  const summary = await runSeed(database.db, { password, passwords: createPasswordHasher() });
  process.stdout.write(
    [
      `Seed complete: venue ${demoVenueSlug}`,
      `owner ${demoOwnerEmail}, dj ${demoDjEmail}`,
      `new qr codes ${summary.createdQrCodes}, new banned words ${summary.createdBannedWords}`,
      "",
    ].join("\n"),
  );
} finally {
  await database.close();
}
