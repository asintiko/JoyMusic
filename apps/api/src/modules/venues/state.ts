import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import type { NowPlaying, PublicVenue, RequestItem, VenueState } from "@joymusic/shared";
import type { Executor } from "../../db/client";
import type { Deps } from "../../deps";
import {
  djSessions,
  playLog,
  requestVotes,
  requests,
  tracks,
  users,
  venues,
} from "../../db/schema";
import { forPublicAudience, toNowPlaying, toRequestItem } from "../requests/mapper";
import { parseVenueSettings, type VenueRecord } from "./service";

export type Audience = "dj" | "public";

const recentlyPlayedLimit = 20;

export function toPublicVenue(venue: VenueRecord): PublicVenue {
  return {
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    city: venue.city,
    theme: venue.theme,
    logoUrl: venue.logoUrl,
    coverUrl: venue.coverUrl,
    settings: parseVenueSettings(venue.settings),
  };
}

export async function findVenueBySlug(
  executor: Executor,
  slug: string,
): Promise<VenueRecord | null> {
  const [venue] = await executor
    .select()
    .from(venues)
    .where(and(eq(venues.slug, slug), isNull(venues.deletedAt)))
    .limit(1);
  return venue ?? null;
}

export async function findActiveSession(executor: Executor, venueId: string) {
  const [row] = await executor
    .select({ session: djSessions, djName: users.name })
    .from(djSessions)
    .innerJoin(users, eq(users.id, djSessions.djUserId))
    .where(and(eq(djSessions.venueId, venueId), isNull(djSessions.endedAt)))
    .limit(1);
  return row ?? null;
}

export async function loadNowPlaying(
  executor: Executor,
  sessionId: string,
): Promise<NowPlaying | null> {
  const [row] = await executor
    .select({ log: playLog, track: tracks, dedicatedTo: requests.dedicatedTo })
    .from(playLog)
    .leftJoin(tracks, eq(tracks.id, playLog.trackId))
    .leftJoin(requests, eq(requests.id, playLog.requestId))
    .where(and(eq(playLog.sessionId, sessionId), isNull(playLog.endedAt)))
    .orderBy(desc(playLog.startedAt), desc(playLog.id))
    .limit(1);
  return row ? toNowPlaying(row.log, row.track, row.dedicatedTo) : null;
}

export async function loadRequestItems(
  executor: Executor,
  requestIds: readonly string[],
  deviceId: string | null,
): Promise<Map<string, RequestItem>> {
  if (requestIds.length === 0) return new Map();
  const rows = await executor
    .select({ request: requests, track: tracks })
    .from(requests)
    .leftJoin(tracks, eq(tracks.id, requests.trackId))
    .where(inArray(requests.id, [...requestIds]));
  const mine = await votedRequestIds(
    executor,
    rows.map((row) => row.request.id),
    deviceId,
  );
  return new Map(
    rows.map((row) => [
      row.request.id,
      toRequestItem(row.request, row.track, mine.has(row.request.id)),
    ]),
  );
}

export async function votedRequestIds(
  executor: Executor,
  requestIds: readonly string[],
  deviceId: string | null,
): Promise<Set<string>> {
  if (!deviceId || requestIds.length === 0) return new Set();
  const rows = await executor
    .select({ requestId: requestVotes.requestId })
    .from(requestVotes)
    .where(
      and(eq(requestVotes.deviceId, deviceId), inArray(requestVotes.requestId, [...requestIds])),
    );
  return new Set(rows.map((row) => row.requestId));
}

export interface StateOptions {
  audience: Audience;
  deviceId?: string | null;
}

export async function buildVenueState(
  deps: Deps,
  venue: VenueRecord,
  options: StateOptions,
): Promise<VenueState> {
  const { db } = deps;
  const seq = await deps.sequences.current(venue.id);
  const active = await findActiveSession(db, venue.id);
  const base = {
    venue: toPublicVenue(venue),
    seq,
    serverTime: new Date().toISOString(),
  };
  if (!active) {
    return { ...base, session: null, nowPlaying: null, queue: [], pending: [], recentlyPlayed: [] };
  }
  const sessionId = active.session.id;
  const [open, played, nowPlaying] = await Promise.all([
    db
      .select({ request: requests, track: tracks })
      .from(requests)
      .leftJoin(tracks, eq(tracks.id, requests.trackId))
      .where(
        and(eq(requests.sessionId, sessionId), inArray(requests.status, ["pending", "accepted"])),
      )
      .orderBy(asc(requests.createdAt), asc(requests.id)),
    db
      .select({ request: requests, track: tracks })
      .from(requests)
      .leftJoin(tracks, eq(tracks.id, requests.trackId))
      .where(and(eq(requests.sessionId, sessionId), eq(requests.status, "played")))
      .orderBy(desc(requests.playedAt), desc(requests.id))
      .limit(recentlyPlayedLimit),
    loadNowPlaying(db, sessionId),
  ]);
  const all = [...open, ...played];
  const mine = await votedRequestIds(
    db,
    all.map((row) => row.request.id),
    options.deviceId ?? null,
  );
  const present = (row: (typeof all)[number]): RequestItem => {
    const item = toRequestItem(row.request, row.track, mine.has(row.request.id));
    return options.audience === "dj" ? item : forPublicAudience(item);
  };
  const queue = open
    .filter((row) => row.request.status === "accepted")
    .sort(
      (a, b) =>
        (a.request.position ?? Number.MAX_SAFE_INTEGER) -
          (b.request.position ?? Number.MAX_SAFE_INTEGER) ||
        a.request.createdAt.getTime() - b.request.createdAt.getTime(),
    )
    .map(present);
  const pending = open
    .filter((row) => row.request.status === "pending")
    .sort(
      (a, b) =>
        b.request.votes - a.request.votes ||
        a.request.createdAt.getTime() - b.request.createdAt.getTime(),
    )
    .map(present);
  return {
    ...base,
    session: {
      id: sessionId,
      djName: active.djName,
      startedAt: active.session.startedAt.toISOString(),
    },
    nowPlaying,
    queue,
    pending,
    recentlyPlayed: played.map(present),
  };
}
