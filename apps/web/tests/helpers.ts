import type { RequestItem, Track, VenueState } from "@joymusic/shared";

export function makeJwt(expiresAtMs: number): string {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${encode({ alg: "HS256" })}.${encode({ exp: Math.floor(expiresAtMs / 1000) })}.signature`;
}

export function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "deezer:1",
    source: "deezer",
    sourceId: "1",
    title: "Yomgʻir",
    artist: "Shahzoda",
    album: null,
    artworkUrl: null,
    previewUrl: null,
    durationSec: 180,
    explicit: false,
    ...overrides,
  };
}

export function makeRequest(overrides: Partial<RequestItem> = {}): RequestItem {
  return {
    id: "req_1",
    sessionId: "ses_1",
    venueId: "ven_1",
    track: null,
    freeText: null,
    title: "Blinding Lights",
    artist: "The Weeknd",
    artworkUrl: null,
    note: null,
    dedicatedTo: null,
    tableLabel: null,
    votes: 1,
    status: "pending",
    declineReason: null,
    position: null,
    mine: false,
    createdAt: "2026-09-30T20:00:00.000Z",
    updatedAt: "2026-09-30T20:00:00.000Z",
    ...overrides,
  };
}

export function makeVenueState(overrides: Partial<VenueState> = {}): VenueState {
  return {
    venue: {
      id: "ven_1",
      slug: "joy-demo-club",
      name: "Joy Demo Club",
      city: "Tashkent",
      theme: "club",
      logoUrl: null,
      coverUrl: null,
      settings: {
        requestsOpen: true,
        maxRequestsPerDevice: 3,
        windowMinutes: 30,
        duplicateWindowMinutes: 60,
        allowFreeText: true,
        allowNotes: true,
        showArtwork: true,
        defaultLocale: "uz",
      },
    },
    session: { id: "ses_1", djName: "DJ Nur", startedAt: "2026-09-30T19:00:00.000Z" },
    nowPlaying: null,
    queue: [],
    pending: [],
    recentlyPlayed: [],
    seq: 1,
    serverTime: "2026-09-30T20:00:00.000Z",
    ...overrides,
  };
}
