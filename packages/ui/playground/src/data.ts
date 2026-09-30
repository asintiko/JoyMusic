import type { Locale } from "@joymusic/shared";
import type { QueueItemRequest } from "../../src";

export interface MockTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  bpm: number;
  key: string;
  explicit?: boolean;
}

export const tracks: MockTrack[] = [
  { id: "t1", title: "Oydin kecha", artist: "Ozod & Nilufar", album: "Tun ohanglari", durationSec: 214, bpm: 118, key: "8A" },
  { id: "t2", title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", durationSec: 200, bpm: 171, key: "6A" },
  { id: "t3", title: "Yulduzlar", artist: "Timur Soul", album: "Yulduzlar", durationSec: 231, bpm: 102, key: "11B" },
  { id: "t4", title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", durationSec: 203, bpm: 103, key: "6B" },
  { id: "t5", title: "Мокрые кроссовки", artist: "Тима Белорусских", album: "Мокрые кроссовки", durationSec: 189, bpm: 96, key: "4A", explicit: false },
  { id: "t6", title: "One More Time", artist: "Daft Punk", album: "Discovery", durationSec: 320, bpm: 123, key: "5A" },
  { id: "t7", title: "Kechqurun", artist: "Laylo", album: "Kechqurun", durationSec: 247, bpm: 90, key: "2A" },
  { id: "t8", title: "Titanium", artist: "David Guetta, Sia", album: "Nothing but the Beat", durationSec: 245, bpm: 126, key: "10B" },
  { id: "t9", title: "Sweet Dreams", artist: "Eurythmics", album: "Sweet Dreams", durationSec: 216, bpm: 125, key: "9A", explicit: false },
  { id: "t10", title: "Gʻunchalarim", artist: "Malika Sadiq", album: "Bahor", durationSec: 258, bpm: 84, key: "1A" },
];

export const nowPlayingTrack = tracks[0] as MockTrack;

export const nowPlayingStartedOffset = 87;

const names: Record<Locale, string[]> = {
  uz: ["Aziz", "Madina", "Sardor", "Dilnoza"],
  ru: ["Азиза", "Мадины", "Сардора", "Дилноза"],
  en: ["Aziz", "Madina", "Sardor", "Dilnoza"],
};

export function dedicationNames(lang: Locale): string[] {
  return names[lang];
}

function request(
  index: number,
  status: QueueItemRequest["status"],
  overrides: Partial<QueueItemRequest> = {},
): QueueItemRequest {
  const track = tracks[index] as MockTrack;
  return {
    title: track.title,
    artist: track.artist,
    artworkUrl: null,
    status,
    votes: 1,
    tableLabel: null,
    note: null,
    dedicatedTo: null,
    durationSec: track.durationSec,
    ...overrides,
  };
}

export { request as buildRequest };

export const adminHours = [2, 1, 0, 0, 0, 0, 1, 2, 4, 6, 8, 9, 10, 12, 14, 18, 26, 34, 44, 61, 78, 96, 118, 84];
export const spark = {
  requests: [22, 26, 24, 31, 29, 38, 35, 44, 41, 52, 49, 61],
  guests: [12, 14, 13, 18, 17, 19, 24, 22, 27, 26, 31, 34],
  scans: [40, 38, 52, 47, 61, 58, 66, 71, 64, 79, 84, 92],
  decline: [9, 8, 10, 7, 8, 6, 7, 6, 5, 6, 5, 4],
};

export const adminVenues = [
  { name: "Nomad Lounge", city: "Toshkent", theme: "lounge" as const, dj: "DJ Rustam", requests: 2418, status: "live" as const, trend: [8, 12, 11, 15, 14, 19, 22, 24] },
  { name: "Neon Garden", city: "Samarqand", theme: "club" as const, dj: "DJ Kamola", requests: 1986, status: "live" as const, trend: [14, 12, 16, 18, 15, 20, 19, 23] },
  { name: "Qahva Bahor", city: "Toshkent", theme: "cafe" as const, dj: "DJ Sherzod", requests: 742, status: "idle" as const, trend: [6, 7, 5, 8, 9, 7, 8, 9] },
  { name: "Afsona Club", city: "Buxoro", theme: "club" as const, dj: "DJ Malika", requests: 1310, status: "live" as const, trend: [9, 11, 14, 12, 16, 15, 18, 17] },
  { name: "Chorsu Roof", city: "Toshkent", theme: "lounge" as const, dj: "DJ Jasur", requests: 528, status: "paused" as const, trend: [10, 9, 8, 6, 7, 5, 4, 4] },
  { name: "Oasis Café", city: "Namangan", theme: "cafe" as const, dj: "DJ Nigora", requests: 391, status: "idle" as const, trend: [3, 4, 4, 5, 6, 5, 6, 7] },
];
