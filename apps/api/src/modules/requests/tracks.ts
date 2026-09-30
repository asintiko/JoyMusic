import { eq } from "drizzle-orm";
import type { FreeTextTrack, RequestCreateInput, Track } from "@joymusic/shared";
import type { Executor } from "../../db/client";
import type { Deps } from "../../deps";
import { tracks } from "../../db/schema";
import { notFound } from "../../errors";
import { toMatchKey } from "../../lib/text";
import { toTrack } from "./mapper";

export interface RequestSubject {
  track: Track | null;
  freeText: FreeTextTrack | null;
  title: string;
  artist: string;
  artworkUrl: string | null;
}

export function subjectMatchKey(artist: string, title: string): string {
  return `${toMatchKey(artist)}|${toMatchKey(title)}`;
}

export async function upsertTrack(executor: Executor, track: Track): Promise<void> {
  const values = {
    id: track.id,
    source: track.source,
    sourceId: track.sourceId,
    title: track.title,
    artist: track.artist,
    album: track.album,
    artworkUrl: track.artworkUrl,
    previewUrl: track.previewUrl,
    durationSec: track.durationSec,
    explicit: track.explicit,
    normalizedSearch: toMatchKey(`${track.artist} ${track.title}`),
  };
  await executor
    .insert(tracks)
    .values(values)
    .onConflictDoUpdate({
      target: tracks.id,
      set: {
        title: values.title,
        artist: values.artist,
        album: values.album,
        artworkUrl: values.artworkUrl,
        previewUrl: values.previewUrl,
        durationSec: values.durationSec,
        explicit: values.explicit,
        normalizedSearch: values.normalizedSearch,
      },
    });
}

async function lookupTrack(deps: Deps, id: string): Promise<Track | null> {
  try {
    const found = await deps.catalog.getTrack(id);
    if (found) return found;
  } catch {
    return null;
  }
  return null;
}

export async function resolveSubject(
  deps: Deps,
  input: RequestCreateInput,
): Promise<RequestSubject> {
  const id = input.track?.id ?? input.trackId;
  if (id) {
    let resolved = await lookupTrack(deps, id);
    if (!resolved) {
      const [row] = await deps.db.select().from(tracks).where(eq(tracks.id, id)).limit(1);
      resolved = row ? toTrack(row) : null;
    }
    if (resolved) {
      await upsertTrack(deps.db, resolved);
      return {
        track: resolved,
        freeText: null,
        title: resolved.title,
        artist: resolved.artist,
        artworkUrl: resolved.artworkUrl,
      };
    }
    if (!input.track) throw notFound("Track not found");
    return {
      track: null,
      freeText: { artist: input.track.artist, title: input.track.title },
      title: input.track.title,
      artist: input.track.artist,
      artworkUrl: input.track.artworkUrl,
    };
  }
  const freeText = input.freeText;
  if (!freeText) throw notFound("Track not found");
  return {
    track: null,
    freeText,
    title: freeText.title,
    artist: freeText.artist,
    artworkUrl: null,
  };
}
