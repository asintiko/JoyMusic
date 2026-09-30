import {
  createCatalog,
  type Catalog,
  type CatalogHit,
  type CatalogProvider,
} from "@joymusic/catalog";
import type { AdminVenue, SessionSummary, Track, VenueSettings } from "@joymusic/shared";
import { createApi } from "./api";
import { createTestContext, type TestContext, type TestContextOptions } from "./context";
import { addMember, apiOf, createVenue, registerOwner, type Actor } from "./factories";

export function makeTrack(
  sourceId: string,
  artist: string,
  title: string,
  extra: Partial<Track> = {},
): Track {
  return {
    id: `deezer:${sourceId}`,
    source: "deezer",
    sourceId,
    title,
    artist,
    album: "Album",
    artworkUrl: `https://img.example/${sourceId}.jpg`,
    previewUrl: `https://preview.example/${sourceId}.mp3`,
    durationSec: 200,
    explicit: false,
    ...extra,
  };
}

export const sampleTracks: Track[] = [
  makeTrack("101", "Rayhon", "Sensiz"),
  makeTrack("102", "Shahzoda", "Yuragim"),
  makeTrack("103", "Dua Lipa", "Levitating"),
  makeTrack("104", "Daft Punk", "One More Time"),
  makeTrack("105", "Coldplay", "Yellow"),
  makeTrack("106", "Adele", "Hello"),
];

export function createMockCatalog(list: readonly Track[] = sampleTracks): Catalog {
  const hits = (tracks: readonly Track[]): CatalogHit[] =>
    tracks.map((track) => ({ track, popularity: 100 }));
  const provider: CatalogProvider = {
    id: "deezer",
    search(query, limit) {
      const words = query.toLowerCase().split(/\s+/).filter(Boolean);
      const found = list.filter((track) => {
        const haystack = `${track.artist} ${track.title}`.toLowerCase();
        return words.every((word) => haystack.includes(word));
      });
      return Promise.resolve(hits(found.slice(0, limit)));
    },
    getTrack(sourceId) {
      const found = list.find((track) => track.sourceId === sourceId);
      return Promise.resolve(found ? { track: found, popularity: 100 } : null);
    },
    chart(limit) {
      return Promise.resolve(hits(list.slice(0, limit)));
    },
    playlistTracks(_query, limit) {
      return Promise.resolve(hits(list.slice(0, limit)));
    },
  };
  return createCatalog({ providers: [provider], retryAttempts: 1, retryBaseDelayMs: 1 });
}

export interface Fixture {
  context: TestContext;
  owner: Actor;
  venue: AdminVenue;
  session: SessionSummary;
  api: ReturnType<typeof createApi>;
  guest(deviceId?: string, tableToken?: string): Promise<GuestHandle>;
}

export interface GuestHandle {
  token: string;
  deviceId: string;
  tableLabel: string | null;
}

export async function createFixture(
  context: TestContext,
  options: { startSession?: boolean; settings?: Partial<VenueSettings>; owner?: Actor } = {},
): Promise<Fixture> {
  const api = apiOf(context);
  const owner = options.owner ?? (await registerOwner(context));
  const venue = await createVenue(context, owner);
  if (options.settings) {
    await api.ok("adminVenueUpdate", {
      token: owner.accessToken,
      params: { venueId: venue.id },
      body: { settings: options.settings },
    });
  }
  const session =
    options.startSession === false
      ? (undefined as unknown as SessionSummary)
      : await api.ok("djSessionStart", { token: owner.accessToken, params: { venueId: venue.id } });
  return {
    context,
    owner,
    venue,
    session,
    api,
    async guest(deviceId, tableToken) {
      const joined = await api.ok("guestJoin", {
        params: { slug: venue.slug },
        body: {
          ...(deviceId ? { deviceId } : {}),
          ...(tableToken ? { tableToken } : {}),
        },
      });
      return { token: joined.guestToken, deviceId: joined.deviceId, tableLabel: joined.tableLabel };
    },
  };
}

export async function newContext(options: TestContextOptions = {}): Promise<TestContext> {
  return createTestContext({
    ...options,
    deps: { catalog: createMockCatalog(), ...options.deps },
  });
}

export { addMember };
