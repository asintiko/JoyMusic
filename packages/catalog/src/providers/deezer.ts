import { z } from "zod";
import type { CatalogHit, CatalogProvider, FetchLike } from "../types";
import { ProviderError } from "../types";
import { buildTrack, compactHits, readJson, resolveFetch } from "./shared";

const deezerArtistSchema = z.object({ name: z.string() });

const deezerAlbumSchema = z.object({
  title: z.string().optional(),
  cover_big: z.string().optional(),
  cover_xl: z.string().optional(),
  md5_image: z.string().optional(),
});

export const deezerTrackSchema = z.object({
  id: z.number(),
  title: z.string(),
  duration: z.number().optional(),
  rank: z.number().optional(),
  explicit_lyrics: z.boolean().optional(),
  preview: z.string().optional(),
  md5_image: z.string().optional(),
  artist: deezerArtistSchema,
  album: deezerAlbumSchema.optional(),
});
export type DeezerTrack = z.infer<typeof deezerTrackSchema>;

const deezerListSchema = z.object({ data: z.array(z.unknown()) });

const deezerPlaylistSearchSchema = z.object({
  data: z.array(
    z.object({ id: z.number(), title: z.string().optional(), nb_tracks: z.number().optional() }),
  ),
});

const deezerErrorSchema = z.object({
  error: z.object({
    type: z.string().optional(),
    message: z.string().optional(),
    code: z.number().optional(),
  }),
});

const maxDeezerRank = 1_000_000;

const retryableErrorCodes = new Set([4, 700]);
const noDataErrorCode = 800;

function hasArtwork(md5: string | undefined): md5 is string {
  return md5 !== undefined && md5.length > 0;
}

function pickArtwork(track: DeezerTrack): string | null {
  const album = track.album;
  const md5 = album?.md5_image ?? track.md5_image;
  if (!hasArtwork(md5)) return null;
  return album?.cover_xl ?? album?.cover_big ?? null;
}

export function mapDeezerTrack(raw: unknown): CatalogHit | null {
  const parsed = deezerTrackSchema.safeParse(raw);
  if (!parsed.success) return null;
  const item = parsed.data;
  const preview = item.preview && item.preview.length > 0 ? item.preview : null;
  const durationSec =
    item.duration !== undefined && item.duration > 0 ? Math.round(item.duration) : null;
  const track = buildTrack("deezer", String(item.id), {
    title: item.title,
    artist: item.artist.name,
    album: item.album?.title ?? null,
    artworkUrl: pickArtwork(item),
    previewUrl: preview,
    durationSec,
    explicit: item.explicit_lyrics === true,
  });
  if (!track) return null;
  const popularity =
    item.rank === undefined || item.rank <= 0 ? null : Math.min(1, item.rank / maxDeezerRank);
  return { track, popularity };
}

export function mapDeezerList(payload: unknown): CatalogHit[] {
  const parsed = deezerListSchema.safeParse(payload);
  if (!parsed.success) return [];
  return compactHits(parsed.data.data.map(mapDeezerTrack));
}

export function assertDeezerOk(payload: unknown): void {
  const failure = deezerErrorSchema.safeParse(payload);
  if (!failure.success) return;
  const { code, message, type } = failure.data.error;
  throw new ProviderError(`Deezer error ${code ?? "?"}: ${message ?? type ?? "unknown"}`, {
    retryable: code !== undefined && retryableErrorCodes.has(code),
  });
}

export function isDeezerNoData(payload: unknown): boolean {
  const failure = deezerErrorSchema.safeParse(payload);
  return failure.success && failure.data.error.code === noDataErrorCode;
}

export function deezerPreviewExpiry(previewUrl: string | null): number | null {
  if (previewUrl === null) return null;
  const match = /[?&]hdnea=exp=(\d+)/.exec(previewUrl);
  if (!match) return null;
  return Number(match[1]) * 1000;
}

export interface DeezerProviderOptions {
  fetch?: FetchLike;
  baseUrl?: string;
}

export function createDeezerProvider(options: DeezerProviderOptions = {}): CatalogProvider {
  const fetcher = resolveFetch(options.fetch);
  const baseUrl = (options.baseUrl ?? "https://api.deezer.com").replace(/\/+$/, "");

  const getJson = async (path: string, signal: AbortSignal | undefined): Promise<unknown> => {
    const payload = await readJson(fetcher, `${baseUrl}${path}`, signal, "Deezer");
    assertDeezerOk(payload);
    return payload;
  };

  return {
    id: "deezer",
    async search(query, limit, signal) {
      const path = `/search?q=${encodeURIComponent(query)}&limit=${limit}`;
      return mapDeezerList(await getJson(path, signal));
    },
    async getTrack(sourceId, signal) {
      if (!/^\d+$/.test(sourceId)) return null;
      let payload: unknown;
      try {
        payload = await readJson(fetcher, `${baseUrl}/track/${sourceId}`, signal, "Deezer");
      } catch (error) {
        if (error instanceof ProviderError && error.status === 404) return null;
        throw error;
      }
      if (isDeezerNoData(payload)) return null;
      assertDeezerOk(payload);
      return mapDeezerTrack(payload);
    },
    async chart(limit, signal) {
      return mapDeezerList(await getJson(`/chart/0/tracks?limit=${limit}`, signal));
    },
    async playlistTracks(query, limit, signal) {
      const found = await getJson(
        `/search/playlist?q=${encodeURIComponent(query)}&limit=10`,
        signal,
      );
      const parsed = deezerPlaylistSearchSchema.safeParse(found);
      if (!parsed.success) return [];
      const playlist =
        parsed.data.data.find((entry) => (entry.nb_tracks ?? 0) >= 10) ?? parsed.data.data[0];
      if (!playlist) return [];
      return mapDeezerList(await getJson(`/playlist/${playlist.id}/tracks?limit=${limit}`, signal));
    },
  };
}
