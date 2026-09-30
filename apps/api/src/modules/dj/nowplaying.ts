import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, isNull } from "drizzle-orm";
import { routes, type NowPlaying } from "@joymusic/shared";
import { djSessions, playLog, requests, tracks } from "../../db/schema";
import { conflict, notFound } from "../../errors";
import { registerRoute } from "../../http/register-route";
import { exactTrackKey, tracksSimilar } from "../../lib/track-match";
import { lockVenue } from "../../lib/venue-lock";
import type { VenueEventInput } from "../../realtime/publisher";
import { publishEvents } from "../events";
import { loadNowPlaying } from "../venues/state";
import { assertSessionActive, authorizeSession } from "./access";
import {
  beginPlay,
  closeCurrentPlay,
  markPreviousPlayed,
  nowPlayingEvent,
  requestEvents,
} from "./playback";

export const djNowPlayingRoutes: FastifyPluginAsync = async (app) => {
  const deps = app.deps;
  const { db } = deps;

  registerRoute(app, routes.djNowPlayingSet, async ({ params, body, user }) => {
    const { session, venue } = await authorizeSession(deps, user, params.sessionId);
    assertSessionActive(session);
    const outcome = await db.transaction(async (tx) => {
      await lockVenue(tx, venue.id);
      const [fresh] = await tx
        .select()
        .from(djSessions)
        .where(eq(djSessions.id, session.id))
        .limit(1);
      if (!fresh) throw notFound("Session not found");
      assertSessionActive(fresh);
      const now = new Date();
      const input = { artist: body.artist, title: body.title };

      const [current] = await tx
        .select()
        .from(playLog)
        .where(and(eq(playLog.sessionId, session.id), isNull(playLog.endedAt)))
        .orderBy(desc(playLog.startedAt), desc(playLog.id))
        .limit(1);
      if (current && exactTrackKey(current) === exactTrackKey(input)) {
        const changes = {
          bpm: body.bpm ?? current.bpm,
          key: body.key ?? current.key,
          durationSec: body.durationSec ?? current.durationSec,
          artworkUrl: body.artworkUrl ?? current.artworkUrl,
        };
        const changed =
          changes.bpm !== current.bpm ||
          changes.key !== current.key ||
          changes.durationSec !== current.durationSec ||
          changes.artworkUrl !== current.artworkUrl;
        if (changed) await tx.update(playLog).set(changes).where(eq(playLog.id, current.id));
        const nowPlaying = await loadNowPlaying(tx, session.id);
        if (!nowPlaying) throw notFound("Now playing not found");
        return { nowPlaying, events: changed ? [await nowPlayingEvent(tx, session.id)] : [] };
      }

      let linked: typeof requests.$inferSelect | undefined;
      if (body.requestId) {
        [linked] = await tx
          .select()
          .from(requests)
          .where(and(eq(requests.id, body.requestId), eq(requests.sessionId, session.id)))
          .limit(1);
        if (!linked) throw notFound("Request not found in this session");
        if (!["pending", "accepted", "playing"].includes(linked.status)) {
          throw conflict(`A ${linked.status} request cannot be linked to now playing`);
        }
      } else {
        const accepted = await tx
          .select()
          .from(requests)
          .where(and(eq(requests.sessionId, session.id), eq(requests.status, "accepted")))
          .orderBy(requests.position, requests.createdAt, requests.id);
        linked = accepted.find((candidate) => tracksSimilar(candidate, input));
      }

      await closeCurrentPlay(tx, session.id, now);
      const previous = await markPreviousPlayed(tx, session.id, linked?.id ?? null, now);
      if (linked && linked.status !== "playing") {
        await tx
          .update(requests)
          .set({ status: "playing", position: null, declineReason: null, updatedAt: now })
          .where(eq(requests.id, linked.id));
      }
      const [linkedTrack] = linked?.trackId
        ? await tx.select().from(tracks).where(eq(tracks.id, linked.trackId)).limit(1)
        : [];
      await beginPlay(tx, {
        sessionId: session.id,
        venueId: venue.id,
        title: body.title,
        artist: body.artist,
        artworkUrl: body.artworkUrl ?? linked?.artworkUrl ?? null,
        trackId: linked?.trackId ?? null,
        source: body.source,
        requestId: linked?.id ?? null,
        durationSec: body.durationSec ?? linkedTrack?.durationSec ?? null,
        bpm: body.bpm ?? null,
        key: body.key ?? null,
        startedAt: body.startedAt ? new Date(body.startedAt) : now,
      });
      const changedRequests = [...previous, ...(linked ? [linked.id] : [])];
      const events: VenueEventInput[] = [
        ...(await requestEvents(tx, changedRequests)),
        await nowPlayingEvent(tx, session.id),
      ];
      const nowPlaying = await loadNowPlaying(tx, session.id);
      if (!nowPlaying) throw notFound("Now playing not found");
      return { nowPlaying, events };
    });
    await publishEvents(deps.publisher, app.log, venue.id, outcome.events);
    return outcome.nowPlaying satisfies NowPlaying;
  });

  registerRoute(app, routes.djNowPlayingClear, async ({ params, user }) => {
    const { session, venue } = await authorizeSession(deps, user, params.sessionId);
    assertSessionActive(session);
    const events = await db.transaction(async (tx) => {
      await lockVenue(tx, venue.id);
      const now = new Date();
      const closed = await closeCurrentPlay(tx, session.id, now);
      const previous = await markPreviousPlayed(tx, session.id, null, now);
      const result: VenueEventInput[] = await requestEvents(tx, previous);
      if (closed) result.push(await nowPlayingEvent(tx, session.id));
      return result;
    });
    await publishEvents(deps.publisher, app.log, venue.id, events);
    return { ok: true as const };
  });
};
