import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  defaultVenueSettings,
  venueSettingsSchema,
  type AdminVenue,
  type VenueSettings,
} from "@joymusic/shared";
import type { Executor } from "../../db/client";
import { djSessions, venues } from "../../db/schema";

export type VenueRecord = typeof venues.$inferSelect;

export function parseVenueSettings(raw: unknown): VenueSettings {
  const stored = raw && typeof raw === "object" ? raw : {};
  return venueSettingsSchema.parse({ ...defaultVenueSettings, ...stored });
}

export function mergeVenueSettings(
  current: VenueSettings,
  patch: Partial<VenueSettings>,
): VenueSettings {
  const defined = Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  );
  return venueSettingsSchema.parse({ ...current, ...defined });
}

export function toAdminVenue(venue: VenueRecord, activeSessionId: string | null): AdminVenue {
  return {
    id: venue.id,
    organizationId: venue.organizationId,
    slug: venue.slug,
    name: venue.name,
    city: venue.city,
    address: venue.address,
    theme: venue.theme,
    logoUrl: venue.logoUrl,
    coverUrl: venue.coverUrl,
    timezone: venue.timezone,
    settings: parseVenueSettings(venue.settings),
    createdAt: venue.createdAt.toISOString(),
    activeSessionId,
  };
}

export async function activeSessionIds(
  executor: Executor,
  venueIds: readonly string[],
): Promise<Map<string, string>> {
  if (venueIds.length === 0) return new Map();
  const rows = await executor
    .select({ venueId: djSessions.venueId, id: djSessions.id })
    .from(djSessions)
    .where(and(inArray(djSessions.venueId, [...venueIds]), isNull(djSessions.endedAt)));
  return new Map(rows.map((row) => [row.venueId, row.id]));
}

export async function loadAdminVenue(
  executor: Executor,
  venueId: string,
): Promise<AdminVenue | null> {
  const [venue] = await executor
    .select()
    .from(venues)
    .where(and(eq(venues.id, venueId), isNull(venues.deletedAt)))
    .limit(1);
  if (!venue) return null;
  const sessions = await activeSessionIds(executor, [venue.id]);
  return toAdminVenue(venue, sessions.get(venue.id) ?? null);
}
