import type { Track, TrackSource } from "@joymusic/shared";
import type { CatalogHit, CatalogProvider } from "./types";

export function makeTrack(overrides: Partial<Track> & { source?: TrackSource } = {}): Track {
  const source = overrides.source ?? "deezer";
  const sourceId = overrides.sourceId ?? "1";
  return {
    id: `${source}:${sourceId}`,
    source,
    sourceId,
    title: "Title",
    artist: "Artist",
    album: "Album",
    artworkUrl: "https://img.example/cover.jpg",
    previewUrl: "https://preview.example/a.mp3",
    durationSec: 200,
    explicit: false,
    ...overrides,
  };
}

export function hit(track: Track, popularity: number | null = null): CatalogHit {
  return { track, popularity };
}

export interface FakeProviderOptions {
  id: TrackSource;
  search?: (query: string, limit: number, signal?: AbortSignal) => Promise<CatalogHit[]>;
  getTrack?: (sourceId: string) => Promise<CatalogHit | null>;
  chart?: () => Promise<CatalogHit[]>;
  playlistTracks?: (query: string) => Promise<CatalogHit[]>;
}

export interface FakeProvider extends CatalogProvider {
  searchCalls: string[];
  getTrackCalls: string[];
}

export function createFakeProvider(options: FakeProviderOptions): FakeProvider {
  const searchCalls: string[] = [];
  const getTrackCalls: string[] = [];
  const provider: FakeProvider = {
    id: options.id,
    searchCalls,
    getTrackCalls,
    async search(query, limit, signal) {
      searchCalls.push(query);
      return options.search ? options.search(query, limit, signal) : [];
    },
  };
  const getTrack = options.getTrack;
  if (getTrack) {
    provider.getTrack = async (sourceId) => {
      getTrackCalls.push(sourceId);
      return getTrack(sourceId);
    };
  }
  const chart = options.chart;
  if (chart) provider.chart = async () => chart();
  const playlistTracks = options.playlistTracks;
  if (playlistTracks) provider.playlistTracks = async (query) => playlistTracks(query);
  return provider;
}
