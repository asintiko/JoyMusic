import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { routes } from "@joymusic/shared";
import type { Transaction } from "../../db/client";
import { djSessions, playLog, requests, tracks } from "../../db/schema";
import { badRequest, conflict, notFound } from "../../errors";
import { registerRoute } from "../../http/register-route";
import { newId } from "../../lib/ids";
import { lockVenue } from "../../lib/venue-lock";
import { publishEvents } from "../events";
import { resolveSubject } from "../requests/tracks";
import { resolveTableLabel } from "../guest/service";
import { loadRequestItems } from "../venues/state";
import type { VenueEventInput } from "../../realtime/publisher";
import { assertSessionActive, authorizeRequest, authorizeSession } from "./access";
import {
  beginPlay,
  closeCurrentPlay,
  markPreviousPlayed,
  nextQueuePosition,
  nowPlayingEvent,
  requestEvents,
} from "./playback";

async function lockedRequest(tx: Transaction, requestId: string) {
  const [row] = await tx.select().from(requests).where(eq(requests.id, requestId)).limit(1);
  if (!row) throw notFound("Request not found");
  await lockVenue(tx, row.venueId);
  const [fresh] = await tx.select().from(requests).where(eq(requests.id, requestId)).limit(1);
  if (!fresh) throw notFound("Request not found");
  const [session] = await tx
    .select()
    .from(djSessions)
    .where(eq(djSessions.id, fresh.sessionId))
    .limit(1);
  if (!session) throw notFound("Session not found");
  return { request: fresh, session };
}

async function itemOf(tx: Transaction, requestId: string) {
  const [item] = (await loadRequestItems(tx, [requestId], null)).values();
  if (!item) throw notFound("Request not found");
  return item;
}

export const djQueueRoutes: FastifyPluginAsync = async (app) => {
  const deps = app.deps;
  const { db } = deps;

  registerRoute(app, routes.djQueueAdd, async ({ params, body, user, reply }) => {
    const { session, venue } = await authorizeSession(deps, user, params.sessionId);
    assertSessionActive(session);
    const subject = await resolveSubject(deps, body);
    const tableLabel = await resolveTableLabel(db, venue.id, body.tableToken);
    const note = body.note?.trim() || null;
    const dedicatedTo = body.dedicatedTo?.trim() || null;
    const outcome = await db.transaction(async (tx) => {
      await lockVenue(tx, venue.id);
      const [fresh] = await tx
        .select()
        .from(djSessions)
        .where(eq(djSessions.id, session.id))
        .limit(1);
      if (!fresh) throw notFound("Session not found");
      assertSessionActive(fresh);
      const id = newId("req");
      const now = new Date();
      await tx.insert(requests).values({
        id,
        sessionId: session.id,
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
        deviceId: `dj:${user.id}`,
        votes: 1,
        status: "accepted",
        position: await nextQueuePosition(tx, session.id),
        createdAt: now,
        updatedAt: now,
      });
      return { item: await itemOf(tx, id) };
    });
    await publishEvents(deps.publisher, app.log, venue.id, [
      { type: "request.upserted", data: { request: outcome.item } },
    ]);
    reply.code(201);
    return outcome.item;
  });

  registerRoute(app, routes.djRequestAccept, async ({ params, user }) => {
    const { venue } = await authorizeRequest(deps, user, params.id);
    const outcome = await db.transaction(async (tx) => {
      const { request, session } = await lockedRequest(tx, params.id);
      if (request.status === "accepted") return { item: await itemOf(tx, request.id), events: [] };
      assertSessionActive(session);
      if (request.status !== "pending" && request.status !== "declined") {
        throw conflict(`A ${request.status} request cannot be accepted`);
      }
      await tx
        .update(requests)
        .set({
          status: "accepted",
          declineReason: null,
          position: await nextQueuePosition(tx, request.sessionId),
          updatedAt: new Date(),
        })
        .where(eq(requests.id, request.id));
      const events = await requestEvents(tx, [request.id]);
      return { item: await itemOf(tx, request.id), events };
    });
    await publishEvents(deps.publisher, app.log, venue.id, outcome.events);
    return outcome.item;
  });

  registerRoute(app, routes.djRequestDecline, async ({ params, body, user }) => {
    const { venue } = await authorizeRequest(deps, user, params.id);
    const outcome = await db.transaction(async (tx) => {
      const { request, session } = await lockedRequest(tx, params.id);
      if (request.status === "declined") return { item: await itemOf(tx, request.id), events: [] };
      assertSessionActive(session);
      if (request.status !== "pending" && request.status !== "accepted") {
        throw conflict(`A ${request.status} request cannot be declined`);
      }
      await tx
        .update(requests)
        .set({
          status: "declined",
          declineReason: body.reason?.trim() || null,
          position: null,
          updatedAt: new Date(),
        })
        .where(eq(requests.id, request.id));
      const events = await requestEvents(tx, [request.id]);
      return { item: await itemOf(tx, request.id), events };
    });
    await publishEvents(deps.publisher, app.log, venue.id, outcome.events);
    return outcome.item;
  });

  registerRoute(app, routes.djRequestPlay, async ({ params, user }) => {
    const { venue } = await authorizeRequest(deps, user, params.id);
    const outcome = await db.transaction(async (tx) => {
      const { request, session } = await lockedRequest(tx, params.id);
      if (request.status === "playing") return { item: await itemOf(tx, request.id), events: [] };
      assertSessionActive(session);
      if (request.status !== "pending" && request.status !== "accepted") {
        throw conflict(`A ${request.status} request cannot be played`);
      }
      const now = new Date();
      await closeCurrentPlay(tx, request.sessionId, now);
      const previous = await markPreviousPlayed(tx, request.sessionId, request.id, now);
      await tx
        .update(requests)
        .set({ status: "playing", position: null, declineReason: null, updatedAt: now })
        .where(eq(requests.id, request.id));
      const [trackRow] = request.trackId
        ? await tx.select().from(tracks).where(eq(tracks.id, request.trackId)).limit(1)
        : [];
      await beginPlay(tx, {
        sessionId: request.sessionId,
        venueId: request.venueId,
        title: request.title,
        artist: request.artist,
        artworkUrl: request.artworkUrl,
        trackId: request.trackId,
        source: "request",
        requestId: request.id,
        durationSec: trackRow?.durationSec ?? null,
        bpm: null,
        key: null,
        startedAt: now,
      });
      const events = [
        ...(await requestEvents(tx, [...previous, request.id])),
        await nowPlayingEvent(tx, request.sessionId),
      ];
      return { item: await itemOf(tx, request.id), events };
    });
    await publishEvents(deps.publisher, app.log, venue.id, outcome.events);
    return outcome.item;
  });

  registerRoute(app, routes.djRequestPlayed, async ({ params, user }) => {
    const { venue } = await authorizeRequest(deps, user, params.id);
    const outcome = await db.transaction(async (tx) => {
      const { request, session } = await lockedRequest(tx, params.id);
      if (request.status === "played") return { item: await itemOf(tx, request.id), events: [] };
      assertSessionActive(session);
      if (request.status !== "playing" && request.status !== "accepted") {
        throw conflict(`A ${request.status} request cannot be marked as played`);
      }
      const now = new Date();
      await tx
        .update(requests)
        .set({ status: "played", playedAt: now, position: null, updatedAt: now })
        .where(eq(requests.id, request.id));
      const closed = await tx
        .update(playLog)
        .set({ endedAt: now })
        .where(and(eq(playLog.requestId, request.id), isNull(playLog.endedAt)))
        .returning({ id: playLog.id });
      const [existing] = await tx
        .select({ id: playLog.id })
        .from(playLog)
        .where(eq(playLog.requestId, request.id))
        .limit(1);
      if (!existing) {
        await beginPlay(tx, {
          sessionId: request.sessionId,
          venueId: request.venueId,
          title: request.title,
          artist: request.artist,
          artworkUrl: request.artworkUrl,
          trackId: request.trackId,
          source: "request",
          requestId: request.id,
          durationSec: null,
          bpm: null,
          key: null,
          startedAt: now,
        });
        await tx.update(playLog).set({ endedAt: now }).where(eq(playLog.requestId, request.id));
      }
      const events: VenueEventInput[] = await requestEvents(tx, [request.id]);
      if (closed.length > 0) events.push(await nowPlayingEvent(tx, request.sessionId));
      return { item: await itemOf(tx, request.id), events };
    });
    await publishEvents(deps.publisher, app.log, venue.id, outcome.events);
    return outcome.item;
  });

  registerRoute(app, routes.djQueueReorder, async ({ params, body, user }) => {
    const { session, venue } = await authorizeSession(deps, user, params.sessionId);
    assertSessionActive(session);
    if (new Set(body.order).size !== body.order.length) {
      throw badRequest("The order contains duplicate request ids");
    }
    const events = await db.transaction(async (tx) => {
      await lockVenue(tx, venue.id);
      const accepted = await tx
        .select({ id: requests.id })
        .from(requests)
        .where(and(eq(requests.sessionId, session.id), eq(requests.status, "accepted")))
        .orderBy(asc(requests.position), asc(requests.createdAt), asc(requests.id));
      const acceptedIds = new Set(accepted.map((row) => row.id));
      const unknown = body.order.filter((id) => !acceptedIds.has(id));
      if (unknown.length > 0) {
        throw badRequest("The order contains requests that are not in the queue", { unknown });
      }
      const listed = new Set(body.order);
      const finalOrder = [
        ...body.order,
        ...accepted.map((row) => row.id).filter((id) => !listed.has(id)),
      ];
      const now = new Date();
      for (const [index, id] of finalOrder.entries()) {
        await tx
          .update(requests)
          .set({ position: index + 1, updatedAt: now })
          .where(and(eq(requests.id, id), inArray(requests.status, ["accepted"])));
      }
      return [{ type: "queue.reordered" as const, data: { order: finalOrder } }];
    });
    await publishEvents(deps.publisher, app.log, venue.id, events);
    return { ok: true as const };
  });
};
