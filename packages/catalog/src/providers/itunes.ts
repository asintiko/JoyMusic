import { z } from "zod";
import type { CatalogHit, CatalogProvider, FetchLike } from "../types";
import { buildTrack, compactHits, readJson, resolveFetch } from "./shared";

const itunesSongSchema = z.object({
  trackId: z.number(),
  artistName: z.string(),
  trackName: z.string(),
  collectionName: z.string().optional(),
  artworkUrl100: z.string().optional(),
  previewUrl: z.string().optional(),
  trackTimeMillis: z.number().optional(),
  trackExplicitness: z.string().optional(),
  kind: z.string().optional(),
  wrapperType: z.string().optional(),
});

const itunesResponseSchema = z.object({ results: z.array(z.unknown()) });

export function upgradeItunesArtwork(url: string, size = 600): string {
  return url.replace(/\/\d+x\d+(bb)?\.(jpg|png|webp)$/i, `/${size}x${size}bb.$2`);
}

export function mapItunesTrack(raw: unknown): CatalogHit | null {
  const parsed = itunesSongSchema.safeParse(raw);
  if (!parsed.success) return null;
  const item = parsed.data;
  if (item.kind !== undefined && item.kind !== "song") return null;
  if (item.wrapperType !== undefined && item.wrapperType !== "track") return null;
  const durationSec =
    item.trackTimeMillis !== undefined && item.trackTimeMillis > 0
      ? Math.max(1, Math.round(item.trackTimeMillis / 1000))
      : null;
  const track = buildTrack("itunes", String(item.trackId), {
    title: item.trackName,
    artist: item.artistName,
    album: item.collectionName ?? null,
    artworkUrl: item.artworkUrl100 ? upgradeItunesArtwork(item.artworkUrl100) : null,
    previewUrl: item.previewUrl && item.previewUrl.length > 0 ? item.previewUrl : null,
    durationSec,
    explicit: item.trackExplicitness === "explicit",
  });
  return track ? { track, popularity: null } : null;
}

export function mapItunesList(payload: unknown): CatalogHit[] {
  const parsed = itunesResponseSchema.safeParse(payload);
  if (!parsed.success) return [];
  return compactHits(parsed.data.results.map(mapItunesTrack));
}

export interface ItunesProviderOptions {
  fetch?: FetchLike;
  baseUrl?: string;
  country?: string;
}

export function createItunesProvider(options: ItunesProviderOptions = {}): CatalogProvider {
  const fetcher = resolveFetch(options.fetch);
  const baseUrl = (options.baseUrl ?? "https://itunes.apple.com").replace(/\/+$/, "");
  const country = options.country ?? "US";

  return {
    id: "itunes",
    async search(query, limit, signal) {
      const url = `${baseUrl}/search?term=${encodeURIComponent(query)}&entity=song&media=music&limit=${limit}&country=${country}`;
      return mapItunesList(await readJson(fetcher, url, signal, "iTunes"));
    },
    async getTrack(sourceId, signal) {
      if (!/^\d+$/.test(sourceId)) return null;
      const url = `${baseUrl}/lookup?id=${sourceId}&entity=song&country=${country}`;
      const hits = mapItunesList(await readJson(fetcher, url, signal, "iTunes"));
      return hits.find((hit) => hit.track.sourceId === sourceId) ?? null;
    },
  };
}
