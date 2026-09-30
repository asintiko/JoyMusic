import { and, eq, isNull } from "drizzle-orm";
import { defaultVenueSettings } from "@joymusic/shared";
import { newId, randomUrlToken } from "../lib/ids";
import { normalizeDisplayWord, toMatchKey } from "../lib/text";
import type { PasswordHasher } from "../modules/auth/password";
import type { Database } from "./client";
import { bannedWords, memberships, organizations, qrCodes, users, venues } from "./schema";

export const demoOrganizationName = "Joy Demo";
export const demoOwnerEmail = "demo@joymusic.uz";
export const demoDjEmail = "dj@joymusic.uz";
export const demoVenueSlug = "joy-demo-club";
export const demoQrLabels = [
  ...Array.from({ length: 10 }, (_unused, index) => `Table ${index + 1}`),
  "Bar",
];
export const starterBannedWords = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "хуй",
  "пизд",
  "ебан",
  "блят",
  "сука",
  "jalab",
  "qahba",
  "onangni",
];

export interface SeedOptions {
  password: string;
  passwords: PasswordHasher;
}

export interface SeedSummary {
  organizationId: string;
  venueId: string;
  ownerId: string;
  djId: string;
  createdQrCodes: number;
  createdBannedWords: number;
}

export async function runSeed(db: Database, options: SeedOptions): Promise<SeedSummary> {
  const passwordHash = await options.passwords.hash(options.password);

  async function ensureUser(email: string, name: string): Promise<string> {
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing) return existing.id;
    const id = newId("usr");
    await db
      .insert(users)
      .values({ id, email, name, passwordHash })
      .onConflictDoNothing({ target: users.email });
    const [created] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    return created?.id ?? id;
  }

  const ownerId = await ensureUser(demoOwnerEmail, "Joy Demo Owner");
  const djId = await ensureUser(demoDjEmail, "Joy Demo DJ");

  const [ownerMembership] = await db
    .select({ organizationId: memberships.organizationId })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .where(
      and(
        eq(memberships.userId, ownerId),
        eq(memberships.role, "owner"),
        eq(organizations.name, demoOrganizationName),
      ),
    )
    .limit(1);
  let organizationId = ownerMembership?.organizationId;
  if (!organizationId) {
    organizationId = newId("org");
    await db.insert(organizations).values({ id: organizationId, name: demoOrganizationName });
    await db
      .insert(memberships)
      .values({ id: newId("mem"), organizationId, userId: ownerId, role: "owner" });
  }

  await db
    .insert(memberships)
    .values({ id: newId("mem"), organizationId, userId: djId, role: "dj" })
    .onConflictDoNothing({ target: [memberships.organizationId, memberships.userId] });

  let [venue] = await db
    .select({ id: venues.id })
    .from(venues)
    .where(and(eq(venues.slug, demoVenueSlug), isNull(venues.deletedAt)))
    .limit(1);
  if (!venue) {
    [venue] = await db
      .insert(venues)
      .values({
        id: newId("ven"),
        organizationId,
        slug: demoVenueSlug,
        name: "Joy Demo Club",
        city: "Tashkent",
        theme: "club",
        timezone: "Asia/Tashkent",
        settings: defaultVenueSettings,
      })
      .returning({ id: venues.id });
  }
  if (!venue) throw new Error("Could not create the demo venue");
  const venueId = venue.id;

  const existingLabels = new Set(
    (
      await db.select({ label: qrCodes.label }).from(qrCodes).where(eq(qrCodes.venueId, venueId))
    ).map((row) => row.label),
  );
  const missingLabels = demoQrLabels.filter((label) => !existingLabels.has(label));
  if (missingLabels.length > 0) {
    await db.insert(qrCodes).values(
      missingLabels.map((label) => ({
        id: newId("qr"),
        venueId,
        label,
        token: randomUrlToken(12),
      })),
    );
  }

  const insertedWords = await db
    .insert(bannedWords)
    .values(
      starterBannedWords.map((word) => ({
        id: newId("bw"),
        organizationId,
        word: normalizeDisplayWord(word),
        matchKey: toMatchKey(word),
      })),
    )
    .onConflictDoNothing({ target: [bannedWords.organizationId, bannedWords.matchKey] })
    .returning({ id: bannedWords.id });

  return {
    organizationId,
    venueId,
    ownerId,
    djId,
    createdQrCodes: missingLabels.length,
    createdBannedWords: insertedWords.length,
  };
}
