import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  defaultVenueSettings,
  locales,
  memberRoles,
  nowPlayingSources,
  requestStatuses,
  trackSources,
  venueThemes,
  type VenueSettings,
} from "@joymusic/shared";

const timestamptz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });
const createdAt = () => timestamptz("created_at").notNull().defaultNow();
const updatedAt = () => timestamptz("updated_at").notNull().defaultNow();

export const localeEnum = pgEnum("locale", locales);
export const memberRoleEnum = pgEnum("member_role", memberRoles);
export const venueThemeEnum = pgEnum("venue_theme", venueThemes);
export const requestStatusEnum = pgEnum("request_status", requestStatuses);
export const trackSourceEnum = pgEnum("track_source", trackSources);
export const nowPlayingSourceEnum = pgEnum("now_playing_source", nowPlayingSources);

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("free"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    googleSub: text("google_sub"),
    avatarUrl: text("avatar_url"),
    locale: localeEnum("locale").notNull().default("uz"),
    isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
    uniqueIndex("users_google_sub_unique").on(table.googleSub),
    check("users_email_lowercase", sql`${table.email} = lower(${table.email})`),
  ],
);

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("memberships_org_user_unique").on(table.organizationId, table.userId),
    index("memberships_user_idx").on(table.userId),
  ],
);

export const invites = pgTable(
  "invites",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: memberRoleEnum("role").notNull(),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    acceptedAt: timestamptz("accepted_at"),
    invitedBy: text("invited_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("invites_token_hash_unique").on(table.tokenHash),
    index("invites_org_email_idx").on(table.organizationId, table.email),
    index("invites_email_idx").on(table.email),
    check("invites_email_lowercase", sql`${table.email} = lower(${table.email})`),
  ],
);

export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    familyId: text("family_id").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    revokedAt: timestamptz("revoked_at"),
    replacedBy: text("replaced_by"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("refresh_tokens_token_hash_unique").on(table.tokenHash),
    index("refresh_tokens_family_idx").on(table.familyId),
    index("refresh_tokens_user_idx").on(table.userId),
  ],
);

export const desktopAuthCodes = pgTable(
  "desktop_auth_codes",
  {
    id: text("id").primaryKey(),
    codeHash: text("code_hash").notNull(),
    codeChallenge: text("code_challenge").notNull(),
    state: text("state").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamptz("expires_at").notNull(),
    usedAt: timestamptz("used_at"),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("desktop_auth_codes_code_hash_unique").on(table.codeHash)],
);

export const venues = pgTable(
  "venues",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    city: text("city"),
    address: text("address"),
    theme: venueThemeEnum("theme").notNull().default("club"),
    logoUrl: text("logo_url"),
    coverUrl: text("cover_url"),
    timezone: text("timezone").notNull().default("Asia/Tashkent"),
    settings: jsonb("settings").$type<VenueSettings>().notNull().default(defaultVenueSettings),
    deletedAt: timestamptz("deleted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("venues_slug_unique")
      .on(table.slug)
      .where(sql`${table.deletedAt} is null`),
    index("venues_org_idx").on(table.organizationId),
  ],
);

export const qrCodes = pgTable(
  "qr_codes",
  {
    id: text("id").primaryKey(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    token: text("token").notNull(),
    active: boolean("active").notNull().default(true),
    scans: integer("scans").notNull().default(0),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("qr_codes_token_unique").on(table.token),
    index("qr_codes_venue_idx").on(table.venueId),
  ],
);

export const djSessions = pgTable(
  "dj_sessions",
  {
    id: text("id").primaryKey(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    djUserId: text("dj_user_id")
      .notNull()
      .references(() => users.id),
    startedAt: timestamptz("started_at").notNull().defaultNow(),
    endedAt: timestamptz("ended_at"),
  },
  (table) => [
    uniqueIndex("dj_sessions_one_active_per_venue")
      .on(table.venueId)
      .where(sql`${table.endedAt} is null`),
    index("dj_sessions_venue_started_idx").on(table.venueId, table.startedAt),
  ],
);

export const tracks = pgTable(
  "tracks",
  {
    id: text("id").primaryKey(),
    source: trackSourceEnum("source").notNull(),
    sourceId: text("source_id").notNull(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    album: text("album"),
    artworkUrl: text("artwork_url"),
    previewUrl: text("preview_url"),
    durationSec: integer("duration_sec"),
    explicit: boolean("explicit").notNull().default(false),
    normalizedSearch: text("normalized_search").notNull().default(""),
    firstSeenAt: timestamptz("first_seen_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("tracks_source_source_id_unique").on(table.source, table.sourceId),
    index("tracks_normalized_search_idx").on(table.normalizedSearch.op("text_pattern_ops")),
  ],
);

export const requests = pgTable(
  "requests",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => djSessions.id, { onDelete: "cascade" }),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    trackId: text("track_id").references(() => tracks.id, { onDelete: "set null" }),
    freeTextArtist: text("free_text_artist"),
    freeTextTitle: text("free_text_title"),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    artworkUrl: text("artwork_url"),
    note: text("note"),
    dedicatedTo: text("dedicated_to"),
    tableLabel: text("table_label"),
    deviceId: text("device_id").notNull(),
    votes: integer("votes").notNull().default(1),
    status: requestStatusEnum("status").notNull().default("pending"),
    declineReason: text("decline_reason"),
    position: integer("position"),
    boostAmountMinor: integer("boost_amount_minor").notNull().default(0),
    paymentReference: text("payment_reference"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    playedAt: timestamptz("played_at"),
  },
  (table) => [
    index("requests_venue_status_idx").on(table.venueId, table.status),
    index("requests_session_status_position_idx").on(table.sessionId, table.status, table.position),
    index("requests_venue_device_created_idx").on(table.venueId, table.deviceId, table.createdAt),
    index("requests_venue_created_idx").on(table.venueId, table.createdAt),
    index("requests_created_at_idx").on(table.createdAt),
    index("requests_session_track_idx").on(table.sessionId, table.trackId),
  ],
);

export const requestVotes = pgTable(
  "request_votes",
  {
    id: text("id").primaryKey(),
    requestId: text("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    deviceId: text("device_id").notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("request_votes_request_device_unique").on(table.requestId, table.deviceId)],
);

export const guestDevices = pgTable(
  "guest_devices",
  {
    id: text("id").notNull(),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    firstSeenAt: timestamptz("first_seen_at").notNull().defaultNow(),
    lastSeenAt: timestamptz("last_seen_at").notNull().defaultNow(),
    bannedAt: timestamptz("banned_at"),
  },
  (table) => [
    primaryKey({ name: "guest_devices_pk", columns: [table.venueId, table.id] }),
    index("guest_devices_venue_last_seen_idx").on(table.venueId, table.lastSeenAt),
  ],
);

export const playLog = pgTable(
  "play_log",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => djSessions.id, { onDelete: "cascade" }),
    venueId: text("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    artist: text("artist").notNull().default(""),
    artworkUrl: text("artwork_url"),
    trackId: text("track_id").references(() => tracks.id, { onDelete: "set null" }),
    source: nowPlayingSourceEnum("source").notNull().default("manual"),
    startedAt: timestamptz("started_at").notNull().defaultNow(),
    endedAt: timestamptz("ended_at"),
    durationSec: integer("duration_sec"),
    requestId: text("request_id").references(() => requests.id, { onDelete: "set null" }),
    bpm: real("bpm"),
    key: text("key"),
  },
  (table) => [
    index("play_log_session_started_idx").on(table.sessionId, table.startedAt),
    index("play_log_venue_started_idx").on(table.venueId, table.startedAt),
  ],
);

export const bannedWords = pgTable(
  "banned_words",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    word: text("word").notNull(),
    matchKey: text("match_key").notNull(),
    createdAt: createdAt(),
  },
  (table) => [uniqueIndex("banned_words_org_match_key_unique").on(table.organizationId, table.matchKey)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorUserId: text("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    target: text("target"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
  },
  (table) => [index("audit_log_org_created_idx").on(table.organizationId, table.createdAt)],
);
