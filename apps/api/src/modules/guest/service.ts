import { and, asc, eq, gte, inArray, sql } from "drizzle-orm";
import type { RequestCreateInput, RequestItem } from "@joymusic/shared";
import type { Executor } from "../../db/client";
import type { Deps } from "../../deps";
import { bannedWords, guestDevices, qrCodes, requestVotes, requests } from "../../db/schema";
import {
  conflict,
  contentBlocked,
  forbidden,
  freeTextDisabled,
  noActiveSession,
  notesDisabled,
  notFound,
  requestLimitReached,
  requestsClosed,
} from "../../errors";
import { newId } from "../../lib/ids";
import { findProfanity } from "../../lib/profanity";
import { lockVenue } from "../../lib/venue-lock";
import { requestUpserted } from "../events";
import type { VenueEventInput } from "../../realtime/publisher";
import { scrubRequestItem } from "../requests/mapper";
import { resolveSubject, subjectMatchKey } from "../requests/tracks";
import { parseVenueSettings, type VenueRecord } from "../venues/service";
import { findActiveSession, loadRequestItems } from "../venues/state";

const openStatuses = ["pending", "accepted", "playing"] as const;
const mergeableStatuses = ["pending", "accepted"] as const;
const minuteMs = 60_000;

export interface GuestActor {
  deviceId: string;
  venueId: string;
}

export interface CreatedRequest {
  request: RequestItem;
  merged: boolean;
  events: VenueEventInput[];
}

function cleaned(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function assertDeviceAllowed(
  executor: Executor,
  venueId: string,
  deviceId: string,
): Promise<void> {
  const [device] = await executor
    .select({ bannedAt: guestDevices.bannedAt })
    .from(guestDevices)
    .where(and(eq(guestDevices.venueId, venueId), eq(guestDevices.id, deviceId)))
    .limit(1);
  if (device?.bannedAt) throw forbidden("This device is blocked at this venue");
}

export async function resolveTableLabel(
  executor: Executor,
  venueId: string,
  token: string | undefined,
): Promise<string | null> {
  if (!token) return null;
  const [row] = await executor
    .select({ label: qrCodes.label })
    .from(qrCodes)
    .where(and(eq(qrCodes.venueId, venueId), eq(qrCodes.token, token), eq(qrCodes.active, true)))
    .limit(1);
  return row?.label ?? null;
}

async function organizationMatchKeys(executor: Executor, organizationId: string) {
  const rows = await executor
    .select({ matchKey: bannedWords.matchKey })
    .from(bannedWords)
    .where(eq(bannedWords.organizationId, organizationId));
  return rows.map((row) => row.matchKey);
}

function guestView(item: RequestItem, deviceId: string, ownerDeviceId: string): RequestItem {
  const visible = ownerDeviceId === deviceId ? item : scrubRequestItem(item);
  return { ...visible, mine: true };
}

async function castVote(tx: Executor, requestId: string, deviceId: string): Promise<void> {
  const inserted = await tx
    .insert(requestVotes)
    .values({ id: newId("vot"), requestId, deviceId })
    .onConflictDoNothing({ target: [requestVotes.requestId, requestVotes.deviceId] })
    .returning({ id: requestVotes.id });
  if (inserted.length === 0) throw conflict("You have already requested or voted for this track");
  await tx
    .update(requests)
    .set({ votes: sql`${requests.votes} + 1`, updatedAt: new Date() })
    .where(eq(requests.id, requestId));
}

export async function createGuestRequest(
  deps: Deps,
  venue: VenueRecord,
  guest: GuestActor,
  input: RequestCreateInput,
): Promise<CreatedRequest> {
  const { db } = deps;
  if (guest.venueId !== venue.id) throw forbidden("This guest token belongs to another venue");
  await assertDeviceAllowed(db, venue.id, guest.deviceId);
  const settings = parseVenueSettings(venue.settings);
  if (!settings.requestsOpen) throw requestsClosed();
  if (!(await findActiveSession(db, venue.id))) throw noActiveSession();

  const note = cleaned(input.note);
  const dedicatedTo = cleaned(input.dedicatedTo);
  if ((note || dedicatedTo) && !settings.allowNotes) throw notesDisabled();
  const usesCatalogTrack = Boolean(input.track ?? input.trackId);
  if (!usesCatalogTrack && !settings.allowFreeText) throw freeTextDisabled();

  const organizationKeys = await organizationMatchKeys(db, venue.organizationId);
  const guarded: [string, string | null | undefined][] = [
    ["note", note],
    ["dedicatedTo", dedicatedTo],
    ["freeText.artist", usesCatalogTrack ? null : input.freeText?.artist],
    ["freeText.title", usesCatalogTrack ? null : input.freeText?.title],
  ];
  for (const [field, text] of guarded) {
    if (text && findProfanity(text, organizationKeys)) throw contentBlocked(field);
  }

  const subject = await resolveSubject(deps, input);
  if (!subject.track && usesCatalogTrack) {
    for (const [field, text] of [
      ["track.title", subject.title],
      ["track.artist", subject.artist],
    ] as const) {
      if (findProfanity(text, organizationKeys)) throw contentBlocked(field);
    }
  }
  const tableLabel = await resolveTableLabel(db, venue.id, input.tableToken);
  const subjectKey = subjectMatchKey(subject.artist, subject.title);

  const outcome = await db.transaction(async (tx) => {
    await lockVenue(tx, venue.id);
    const active = await findActiveSession(tx, venue.id);
    if (!active) throw noActiveSession();
    const sessionId = active.session.id;
    const now = new Date();

    if (settings.duplicateWindowMinutes > 0) {
      const since = new Date(now.getTime() - settings.duplicateWindowMinutes * minuteMs);
      const candidates = await tx
        .select()
        .from(requests)
        .where(
          and(
            eq(requests.sessionId, sessionId),
            inArray(requests.status, [...openStatuses]),
            gte(requests.createdAt, since),
          ),
        )
        .orderBy(asc(requests.createdAt), asc(requests.id));
      const duplicate = candidates.find(
        (candidate) =>
          (subject.track !== null && candidate.trackId === subject.track.id) ||
          subjectMatchKey(candidate.artist, candidate.title) === subjectKey,
      );
      if (duplicate) {
        if (mergeableStatuses.some((status) => status === duplicate.status)) {
          await castVote(tx, duplicate.id, guest.deviceId);
        }
        const [item] = (await loadRequestItems(tx, [duplicate.id], guest.deviceId)).values();
        if (!item) throw notFound("Request not found");
        return { merged: true, item, ownerDeviceId: duplicate.deviceId, created: false };
      }
    }

    const windowStart = new Date(now.getTime() - settings.windowMinutes * minuteMs);
    const recent = await tx
      .select({ createdAt: requests.createdAt })
      .from(requests)
      .where(
        and(
          eq(requests.venueId, venue.id),
          eq(requests.deviceId, guest.deviceId),
          gte(requests.createdAt, windowStart),
        ),
      )
      .orderBy(asc(requests.createdAt));
    if (recent.length >= settings.maxRequestsPerDevice) {
      const oldest = recent[recent.length - settings.maxRequestsPerDevice];
      const releaseAt =
        (oldest?.createdAt.getTime() ?? now.getTime()) + settings.windowMinutes * minuteMs;
      throw requestLimitReached(
        settings.maxRequestsPerDevice,
        settings.windowMinutes,
        Math.max(1, Math.ceil((releaseAt - now.getTime()) / 1000)),
      );
    }

    const id = newId("req");
    await tx.insert(requests).values({
      id,
      sessionId,
      venueId: venue.id,
      trackId: subject.track?.id ?? null,
      freeTextArtist: subject.freeText?.artist ?? null,
      freeTextTitle: subject.freeText?.title ?? null,
      title: subject.title,
      artist: subject.artist,
      artworkUrl: subject.artworkUrl,
      note,
      dedicatedTo,
      tableLabel,
      deviceId: guest.deviceId,
      votes: 1,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await tx
      .insert(requestVotes)
      .values({ id: newId("vot"), requestId: id, deviceId: guest.deviceId });
    const [item] = (await loadRequestItems(tx, [id], guest.deviceId)).values();
    if (!item) throw notFound("Request not found");
    return { merged: false, item, ownerDeviceId: guest.deviceId, created: true };
  });

  await deps.cache.delete(`suggestions:${venue.id}`).catch(() => undefined);
  const broadcast = { ...outcome.item, mine: false };
  return {
    request: guestView(outcome.item, guest.deviceId, outcome.ownerDeviceId),
    merged: outcome.merged,
    events: outcome.item.status === "playing" ? [] : [requestUpserted(broadcast)],
  };
}

export async function voteForRequest(
  deps: Deps,
  requestId: string,
  guest: GuestActor,
  venue: VenueRecord,
): Promise<{ request: RequestItem; events: VenueEventInput[] }> {
  const { db } = deps;
  await assertDeviceAllowed(db, venue.id, guest.deviceId);
  if (!parseVenueSettings(venue.settings).requestsOpen) throw requestsClosed();
  const outcome = await db.transaction(async (tx) => {
    await lockVenue(tx, venue.id);
    const [row] = await tx.select().from(requests).where(eq(requests.id, requestId)).limit(1);
    if (!row || row.venueId !== venue.id) throw notFound("Request not found");
    const active = await findActiveSession(tx, venue.id);
    if (!active || active.session.id !== row.sessionId) throw conflict("This request is closed");
    if (!mergeableStatuses.some((status) => status === row.status)) {
      throw conflict("This request is no longer open for votes");
    }
    await castVote(tx, requestId, guest.deviceId);
    const [item] = (await loadRequestItems(tx, [requestId], guest.deviceId)).values();
    if (!item) throw notFound("Request not found");
    return { item, ownerDeviceId: row.deviceId };
  });
  return {
    request: guestView(outcome.item, guest.deviceId, outcome.ownerDeviceId),
    events: [requestUpserted({ ...outcome.item, mine: false })],
  };
}
