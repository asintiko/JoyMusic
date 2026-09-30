import { z } from "zod";
import {
  adminVenueSchema,
  analyticsOverviewSchema,
  auditEntrySchema,
  authResultSchema,
  authTokensSchema,
  bannedWordSchema,
  freeTextTrackSchema,
  idSchema,
  isoDateSchema,
  localeSchema,
  meSchema,
  memberRoleSchema,
  memberSchema,
  nowPlayingSchema,
  nowPlayingSourceSchema,
  publicVenueSchema,
  qrCodeSchema,
  requestItemSchema,
  sessionSummarySchema,
  slugSchema,
  suggestionSectionSchema,
  trackSchema,
  venueSettingsSchema,
  venueStateSchema,
  venueThemeSchema,
} from "./domain";

export type RouteAuth = "none" | "guest" | "user";
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RouteDefinition {
  method: HttpMethod;
  path: string;
  auth: RouteAuth;
  params?: z.ZodType;
  query?: z.ZodType;
  body?: z.ZodType;
  response: z.ZodType;
}

function route<const T extends RouteDefinition>(definition: T): T {
  return definition;
}

const ok = z.object({ ok: z.literal(true) });

const venueSlugParams = z.object({ slug: slugSchema });
const idParams = z.object({ id: idSchema });
const venueIdParams = z.object({ venueId: idSchema });
const sessionIdParams = z.object({ sessionId: idSchema });

export const requestCreateSchema = z
  .object({
    trackId: z.string().min(1).max(160).optional(),
    track: trackSchema.optional(),
    freeText: freeTextTrackSchema.optional(),
    note: z.string().trim().max(200).optional(),
    dedicatedTo: z.string().trim().max(60).optional(),
    tableToken: z.string().max(80).optional(),
  })
  .refine((value) => Boolean(value.track ?? value.trackId ?? value.freeText), {
    message: "track_required",
  });
export type RequestCreateInput = z.infer<typeof requestCreateSchema>;

export const nowPlayingInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200).default(""),
  artworkUrl: z.string().nullable().optional(),
  durationSec: z.number().int().positive().nullable().optional(),
  bpm: z.number().min(40).max(260).nullable().optional(),
  key: z.string().max(8).nullable().optional(),
  source: nowPlayingSourceSchema.default("manual"),
  requestId: idSchema.nullable().optional(),
  startedAt: isoDateSchema.optional(),
});
export type NowPlayingInput = z.infer<typeof nowPlayingInputSchema>;

export const venueCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  city: z.string().trim().max(80).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  theme: venueThemeSchema.default("club"),
  timezone: z.string().default("Asia/Tashkent"),
});
export type VenueCreateInput = z.infer<typeof venueCreateSchema>;

export const venueUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  city: z.string().trim().max(80).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  theme: venueThemeSchema.optional(),
  timezone: z.string().optional(),
  logoUrl: z.string().nullable().optional(),
  coverUrl: z.string().nullable().optional(),
  settings: venueSettingsSchema.partial().optional(),
});
export type VenueUpdateInput = z.infer<typeof venueUpdateSchema>;

export const analyticsQuerySchema = z.object({
  venueId: idSchema.optional(),
  from: isoDateSchema.optional(),
  to: isoDateSchema.optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().int().min(1).max(30).default(20),
});

export const routes = {
  health: route({
    method: "GET",
    path: "/v1/health",
    auth: "none",
    response: z.object({ status: z.literal("ok"), time: isoDateSchema }),
  }),

  venuePublic: route({
    method: "GET",
    path: "/v1/venues/:slug",
    auth: "none",
    params: venueSlugParams,
    response: publicVenueSchema,
  }),
  venueState: route({
    method: "GET",
    path: "/v1/venues/:slug/state",
    auth: "none",
    params: venueSlugParams,
    response: venueStateSchema,
  }),
  guestJoin: route({
    method: "POST",
    path: "/v1/venues/:slug/guest",
    auth: "none",
    params: venueSlugParams,
    body: z.object({
      deviceId: z.string().min(8).max(64).optional(),
      tableToken: z.string().max(80).optional(),
      locale: localeSchema.optional(),
    }),
    response: z.object({
      guestToken: z.string(),
      deviceId: z.string(),
      tableLabel: z.string().nullable(),
    }),
  }),
  suggestions: route({
    method: "GET",
    path: "/v1/venues/:slug/suggestions",
    auth: "none",
    params: venueSlugParams,
    response: z.object({ sections: z.array(suggestionSectionSchema) }),
  }),
  catalogSearch: route({
    method: "GET",
    path: "/v1/catalog/search",
    auth: "none",
    query: searchQuerySchema,
    response: z.object({ tracks: z.array(trackSchema) }),
  }),
  requestCreate: route({
    method: "POST",
    path: "/v1/venues/:slug/requests",
    auth: "guest",
    params: venueSlugParams,
    body: requestCreateSchema,
    response: z.object({ request: requestItemSchema, merged: z.boolean() }),
  }),
  requestVote: route({
    method: "POST",
    path: "/v1/requests/:id/vote",
    auth: "guest",
    params: idParams,
    response: requestItemSchema,
  }),
  requestsMine: route({
    method: "GET",
    path: "/v1/venues/:slug/requests/mine",
    auth: "guest",
    params: venueSlugParams,
    response: z.object({ requests: z.array(requestItemSchema) }),
  }),

  authRegister: route({
    method: "POST",
    path: "/v1/auth/register",
    auth: "none",
    body: z.object({
      email: z.email(),
      password: z.string().min(8).max(128),
      name: z.string().trim().min(1).max(80),
      organizationName: z.string().trim().min(2).max(120),
      locale: localeSchema.optional(),
    }),
    response: authResultSchema,
  }),
  authLogin: route({
    method: "POST",
    path: "/v1/auth/login",
    auth: "none",
    body: z.object({ email: z.email(), password: z.string().min(1).max(128) }),
    response: authResultSchema,
  }),
  authRefresh: route({
    method: "POST",
    path: "/v1/auth/refresh",
    auth: "none",
    body: z.object({ refreshToken: z.string() }),
    response: authTokensSchema,
  }),
  authLogout: route({
    method: "POST",
    path: "/v1/auth/logout",
    auth: "none",
    body: z.object({ refreshToken: z.string() }),
    response: ok,
  }),
  authInviteAccept: route({
    method: "POST",
    path: "/v1/auth/invites/accept",
    auth: "none",
    body: z.object({
      token: z.string(),
      name: z.string().trim().min(1).max(80),
      password: z.string().min(8).max(128),
    }),
    response: authResultSchema,
  }),
  authGoogle: route({
    method: "POST",
    path: "/v1/auth/google",
    auth: "none",
    body: z.object({ idToken: z.string() }),
    response: authResultSchema,
  }),
  authDesktopAuthorize: route({
    method: "POST",
    path: "/v1/auth/desktop/authorize",
    auth: "user",
    body: z.object({
      codeChallenge: z.string().min(43).max(128),
      state: z.string().min(8).max(128),
    }),
    response: z.object({ code: z.string(), state: z.string() }),
  }),
  authDesktopToken: route({
    method: "POST",
    path: "/v1/auth/desktop/token",
    auth: "none",
    body: z.object({ code: z.string(), codeVerifier: z.string().min(43).max(128) }),
    response: authResultSchema,
  }),
  me: route({ method: "GET", path: "/v1/me", auth: "user", response: meSchema }),

  djVenues: route({
    method: "GET",
    path: "/v1/dj/venues",
    auth: "user",
    response: z.object({
      venues: z.array(
        z.object({
          id: idSchema,
          slug: slugSchema,
          name: z.string(),
          theme: venueThemeSchema,
          activeSessionId: idSchema.nullable(),
        }),
      ),
    }),
  }),
  djSessionStart: route({
    method: "POST",
    path: "/v1/dj/venues/:venueId/sessions",
    auth: "user",
    params: venueIdParams,
    response: sessionSummarySchema,
  }),
  djSessionEnd: route({
    method: "POST",
    path: "/v1/dj/sessions/:sessionId/end",
    auth: "user",
    params: sessionIdParams,
    response: sessionSummarySchema,
  }),
  djSessionState: route({
    method: "GET",
    path: "/v1/dj/sessions/:sessionId/state",
    auth: "user",
    params: sessionIdParams,
    response: venueStateSchema,
  }),
  djSessionSettings: route({
    method: "PATCH",
    path: "/v1/dj/sessions/:sessionId/settings",
    auth: "user",
    params: sessionIdParams,
    body: venueSettingsSchema.partial(),
    response: venueSettingsSchema,
  }),
  djQueueAdd: route({
    method: "POST",
    path: "/v1/dj/sessions/:sessionId/requests",
    auth: "user",
    params: sessionIdParams,
    body: requestCreateSchema,
    response: requestItemSchema,
  }),
  djRequestAccept: route({
    method: "POST",
    path: "/v1/dj/requests/:id/accept",
    auth: "user",
    params: idParams,
    response: requestItemSchema,
  }),
  djRequestDecline: route({
    method: "POST",
    path: "/v1/dj/requests/:id/decline",
    auth: "user",
    params: idParams,
    body: z.object({ reason: z.string().trim().max(200).optional() }),
    response: requestItemSchema,
  }),
  djRequestPlay: route({
    method: "POST",
    path: "/v1/dj/requests/:id/play",
    auth: "user",
    params: idParams,
    response: requestItemSchema,
  }),
  djRequestPlayed: route({
    method: "POST",
    path: "/v1/dj/requests/:id/played",
    auth: "user",
    params: idParams,
    response: requestItemSchema,
  }),
  djQueueReorder: route({
    method: "PUT",
    path: "/v1/dj/sessions/:sessionId/queue",
    auth: "user",
    params: sessionIdParams,
    body: z.object({ order: z.array(idSchema).max(500) }),
    response: ok,
  }),
  djNowPlayingSet: route({
    method: "PUT",
    path: "/v1/dj/sessions/:sessionId/nowplaying",
    auth: "user",
    params: sessionIdParams,
    body: nowPlayingInputSchema,
    response: nowPlayingSchema,
  }),
  djNowPlayingClear: route({
    method: "DELETE",
    path: "/v1/dj/sessions/:sessionId/nowplaying",
    auth: "user",
    params: sessionIdParams,
    response: ok,
  }),

  adminVenues: route({
    method: "GET",
    path: "/v1/admin/venues",
    auth: "user",
    response: z.object({ venues: z.array(adminVenueSchema) }),
  }),
  adminVenueCreate: route({
    method: "POST",
    path: "/v1/admin/venues",
    auth: "user",
    body: venueCreateSchema,
    response: adminVenueSchema,
  }),
  adminVenueGet: route({
    method: "GET",
    path: "/v1/admin/venues/:venueId",
    auth: "user",
    params: venueIdParams,
    response: adminVenueSchema,
  }),
  adminVenueUpdate: route({
    method: "PATCH",
    path: "/v1/admin/venues/:venueId",
    auth: "user",
    params: venueIdParams,
    body: venueUpdateSchema,
    response: adminVenueSchema,
  }),
  adminVenueDelete: route({
    method: "DELETE",
    path: "/v1/admin/venues/:venueId",
    auth: "user",
    params: venueIdParams,
    response: ok,
  }),
  adminQrList: route({
    method: "GET",
    path: "/v1/admin/venues/:venueId/qr",
    auth: "user",
    params: venueIdParams,
    response: z.object({ codes: z.array(qrCodeSchema) }),
  }),
  adminQrCreate: route({
    method: "POST",
    path: "/v1/admin/venues/:venueId/qr",
    auth: "user",
    params: venueIdParams,
    body: z.object({ label: z.string().trim().min(1).max(40) }),
    response: qrCodeSchema,
  }),
  adminQrUpdate: route({
    method: "PATCH",
    path: "/v1/admin/qr/:id",
    auth: "user",
    params: idParams,
    body: z.object({
      label: z.string().trim().min(1).max(40).optional(),
      active: z.boolean().optional(),
    }),
    response: qrCodeSchema,
  }),
  adminQrDelete: route({
    method: "DELETE",
    path: "/v1/admin/qr/:id",
    auth: "user",
    params: idParams,
    response: ok,
  }),
  adminMembers: route({
    method: "GET",
    path: "/v1/admin/members",
    auth: "user",
    response: z.object({ members: z.array(memberSchema) }),
  }),
  adminMemberInvite: route({
    method: "POST",
    path: "/v1/admin/members",
    auth: "user",
    body: z.object({ email: z.email(), role: memberRoleSchema.default("dj") }),
    response: z.object({ member: memberSchema, inviteToken: z.string() }),
  }),
  adminMemberUpdate: route({
    method: "PATCH",
    path: "/v1/admin/members/:id",
    auth: "user",
    params: idParams,
    body: z.object({ role: memberRoleSchema }),
    response: memberSchema,
  }),
  adminMemberDelete: route({
    method: "DELETE",
    path: "/v1/admin/members/:id",
    auth: "user",
    params: idParams,
    response: ok,
  }),
  adminSessions: route({
    method: "GET",
    path: "/v1/admin/venues/:venueId/sessions",
    auth: "user",
    params: venueIdParams,
    query: z.object({ limit: z.coerce.number().int().min(1).max(100).default(30) }),
    response: z.object({ sessions: z.array(sessionSummarySchema) }),
  }),
  adminAnalytics: route({
    method: "GET",
    path: "/v1/admin/analytics",
    auth: "user",
    query: analyticsQuerySchema,
    response: analyticsOverviewSchema,
  }),
  adminBannedWords: route({
    method: "GET",
    path: "/v1/admin/moderation/words",
    auth: "user",
    response: z.object({ words: z.array(bannedWordSchema) }),
  }),
  adminBannedWordAdd: route({
    method: "POST",
    path: "/v1/admin/moderation/words",
    auth: "user",
    body: z.object({ word: z.string().trim().min(2).max(60) }),
    response: bannedWordSchema,
  }),
  adminBannedWordDelete: route({
    method: "DELETE",
    path: "/v1/admin/moderation/words/:id",
    auth: "user",
    params: idParams,
    response: ok,
  }),
  adminDeviceBan: route({
    method: "POST",
    path: "/v1/admin/venues/:venueId/devices/:deviceId/ban",
    auth: "user",
    params: z.object({ venueId: idSchema, deviceId: z.string() }),
    response: ok,
  }),
  adminAudit: route({
    method: "GET",
    path: "/v1/admin/audit",
    auth: "user",
    query: z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }),
    response: z.object({ entries: z.array(auditEntrySchema) }),
  }),
} as const;

export type Routes = typeof routes;
export type RouteName = keyof Routes;

type Shape<T, K extends string, F extends string> = T extends {
  [P in K]: infer S extends z.ZodType;
}
  ? { [P in F]: z.input<S> }
  : unknown;

export type RouteInput<R extends RouteDefinition> = Shape<R, "params", "params"> &
  Shape<R, "query", "query"> &
  Shape<R, "body", "body">;

export type RouteOutput<R extends RouteDefinition> = z.output<R["response"]>;

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;

export const errorCodes = [
  "validation_failed",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "rate_limited",
  "requests_closed",
  "request_limit_reached",
  "track_required",
  "free_text_disabled",
  "notes_disabled",
  "content_blocked",
  "no_active_session",
  "invalid_credentials",
  "email_taken",
  "invite_invalid",
  "internal",
] as const;
export type ErrorCode = (typeof errorCodes)[number];
