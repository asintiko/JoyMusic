import { z } from "zod";

export const locales = ["uz", "ru", "en"] as const;
export const localeSchema = z.enum(locales);
export type Locale = z.infer<typeof localeSchema>;
export const defaultLocale: Locale = "uz";

export const venueThemes = ["club", "lounge", "cafe"] as const;
export const venueThemeSchema = z.enum(venueThemes);
export type VenueTheme = z.infer<typeof venueThemeSchema>;

export const memberRoles = ["owner", "admin", "dj"] as const;
export const memberRoleSchema = z.enum(memberRoles);
export type MemberRole = z.infer<typeof memberRoleSchema>;

export const requestStatuses = [
  "pending",
  "accepted",
  "playing",
  "played",
  "declined",
  "expired",
] as const;
export const requestStatusSchema = z.enum(requestStatuses);
export type RequestStatus = z.infer<typeof requestStatusSchema>;

export const openRequestStatuses: readonly RequestStatus[] = ["pending", "accepted", "playing"];

export const nowPlayingSources = [
  "manual",
  "request",
  "prolink",
  "stagelinq",
  "virtualdj",
  "serato",
  "traktor",
  "rekordbox",
] as const;
export const nowPlayingSourceSchema = z.enum(nowPlayingSources);
export type NowPlayingSource = z.infer<typeof nowPlayingSourceSchema>;

export const trackSources = ["deezer", "itunes", "manual"] as const;
export const trackSourceSchema = z.enum(trackSources);
export type TrackSource = z.infer<typeof trackSourceSchema>;

export const idSchema = z.string().min(1).max(64);
export const isoDateSchema = z.iso.datetime({ offset: true });

export const slugSchema = z
  .string()
  .min(3)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const trackSchema = z.object({
  id: z.string().min(1).max(160),
  source: trackSourceSchema,
  sourceId: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  artist: z.string().min(1).max(200),
  album: z.string().max(200).nullable(),
  artworkUrl: z.url().nullable(),
  previewUrl: z.url().nullable(),
  durationSec: z.number().int().positive().nullable(),
  explicit: z.boolean(),
});
export type Track = z.infer<typeof trackSchema>;

export const freeTextTrackSchema = z.object({
  artist: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(160),
});
export type FreeTextTrack = z.infer<typeof freeTextTrackSchema>;

export const venueSettingsSchema = z.object({
  requestsOpen: z.boolean(),
  maxRequestsPerDevice: z.number().int().min(1).max(50),
  windowMinutes: z.number().int().min(1).max(600),
  duplicateWindowMinutes: z.number().int().min(0).max(1440),
  allowFreeText: z.boolean(),
  allowNotes: z.boolean(),
  showArtwork: z.boolean(),
  defaultLocale: localeSchema,
});
export type VenueSettings = z.infer<typeof venueSettingsSchema>;

export const defaultVenueSettings: VenueSettings = {
  requestsOpen: true,
  maxRequestsPerDevice: 3,
  windowMinutes: 30,
  duplicateWindowMinutes: 60,
  allowFreeText: true,
  allowNotes: true,
  showArtwork: true,
  defaultLocale: "uz",
};

export const publicVenueSchema = z.object({
  id: idSchema,
  slug: slugSchema,
  name: z.string().min(1).max(120),
  city: z.string().max(80).nullable(),
  theme: venueThemeSchema,
  logoUrl: z.string().nullable(),
  coverUrl: z.string().nullable(),
  settings: venueSettingsSchema,
});
export type PublicVenue = z.infer<typeof publicVenueSchema>;

export const requestItemSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  venueId: idSchema,
  track: trackSchema.nullable(),
  freeText: freeTextTrackSchema.nullable(),
  title: z.string(),
  artist: z.string(),
  artworkUrl: z.string().nullable(),
  note: z.string().max(200).nullable(),
  dedicatedTo: z.string().max(60).nullable(),
  tableLabel: z.string().max(40).nullable(),
  votes: z.number().int().min(1),
  status: requestStatusSchema,
  declineReason: z.string().max(200).nullable(),
  position: z.number().int().nullable(),
  mine: z.boolean(),
  createdAt: isoDateSchema,
  updatedAt: isoDateSchema,
});
export type RequestItem = z.infer<typeof requestItemSchema>;

export const nowPlayingSchema = z.object({
  title: z.string().min(1).max(200),
  artist: z.string().max(200),
  artworkUrl: z.string().nullable(),
  track: trackSchema.nullable(),
  startedAt: isoDateSchema,
  durationSec: z.number().int().positive().nullable(),
  bpm: z.number().min(40).max(260).nullable(),
  key: z.string().max(8).nullable(),
  source: nowPlayingSourceSchema,
  requestId: idSchema.nullable(),
  dedicatedTo: z.string().max(60).nullable(),
});
export type NowPlaying = z.infer<typeof nowPlayingSchema>;

export const sessionSummarySchema = z.object({
  id: idSchema,
  venueId: idSchema,
  djId: idSchema,
  djName: z.string(),
  startedAt: isoDateSchema,
  endedAt: isoDateSchema.nullable(),
  requestsTotal: z.number().int(),
  playedTotal: z.number().int(),
});
export type SessionSummary = z.infer<typeof sessionSummarySchema>;

export const venueStateSchema = z.object({
  venue: publicVenueSchema,
  session: z
    .object({
      id: idSchema,
      djName: z.string(),
      startedAt: isoDateSchema,
    })
    .nullable(),
  nowPlaying: nowPlayingSchema.nullable(),
  queue: z.array(requestItemSchema),
  pending: z.array(requestItemSchema),
  recentlyPlayed: z.array(requestItemSchema),
  seq: z.number().int().min(0),
  serverTime: isoDateSchema,
});
export type VenueState = z.infer<typeof venueStateSchema>;

export const userSchema = z.object({
  id: idSchema,
  email: z.email(),
  name: z.string().min(1).max(80),
  avatarUrl: z.string().nullable(),
  locale: localeSchema,
});
export type User = z.infer<typeof userSchema>;

export const membershipSchema = z.object({
  organizationId: idSchema,
  organizationName: z.string(),
  role: memberRoleSchema,
});
export type Membership = z.infer<typeof membershipSchema>;

export const meSchema = z.object({
  user: userSchema,
  memberships: z.array(membershipSchema),
  isPlatformAdmin: z.boolean(),
});
export type Me = z.infer<typeof meSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const authResultSchema = authTokensSchema.extend({ me: meSchema });
export type AuthResult = z.infer<typeof authResultSchema>;

export const adminVenueSchema = publicVenueSchema.extend({
  organizationId: idSchema,
  address: z.string().max(200).nullable(),
  timezone: z.string(),
  createdAt: isoDateSchema,
  activeSessionId: idSchema.nullable(),
});
export type AdminVenue = z.infer<typeof adminVenueSchema>;

export const qrCodeSchema = z.object({
  id: idSchema,
  venueId: idSchema,
  label: z.string().min(1).max(40),
  token: z.string(),
  url: z.url(),
  scans: z.number().int(),
  active: z.boolean(),
  createdAt: isoDateSchema,
});
export type QrCode = z.infer<typeof qrCodeSchema>;

export const memberSchema = z.object({
  id: idSchema,
  userId: idSchema.nullable(),
  email: z.email(),
  name: z.string().nullable(),
  role: memberRoleSchema,
  status: z.enum(["active", "invited"]),
  createdAt: isoDateSchema,
});
export type Member = z.infer<typeof memberSchema>;

export const auditEntrySchema = z.object({
  id: idSchema,
  actorName: z.string(),
  action: z.string(),
  target: z.string().nullable(),
  meta: z.record(z.string(), z.unknown()),
  createdAt: isoDateSchema,
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;

export const bannedWordSchema = z.object({
  id: idSchema,
  word: z.string().min(2).max(60),
  createdAt: isoDateSchema,
});
export type BannedWord = z.infer<typeof bannedWordSchema>;

export const analyticsOverviewSchema = z.object({
  totals: z.object({
    sessions: z.number().int(),
    requests: z.number().int(),
    uniqueGuests: z.number().int(),
    played: z.number().int(),
    declineRate: z.number().min(0).max(1),
    scans: z.number().int(),
  }),
  topTracks: z.array(
    z.object({
      title: z.string(),
      artist: z.string(),
      artworkUrl: z.string().nullable(),
      count: z.number().int(),
    }),
  ),
  byHour: z.array(z.object({ hour: z.number().int().min(0).max(23), requests: z.number().int() })),
  byDay: z.array(
    z.object({ date: z.string(), requests: z.number().int(), guests: z.number().int() }),
  ),
  byTable: z.array(
    z.object({ label: z.string(), requests: z.number().int(), scans: z.number().int() }),
  ),
});
export type AnalyticsOverview = z.infer<typeof analyticsOverviewSchema>;

export const suggestionSectionIds = [
  "trending_here",
  "dj_picks",
  "uz_hits",
  "ru_pop",
  "club",
  "slow",
  "birthday",
] as const;
export const suggestionSectionSchema = z.object({
  id: z.enum(suggestionSectionIds),
  tracks: z.array(trackSchema),
});
export type SuggestionSection = z.infer<typeof suggestionSectionSchema>;
