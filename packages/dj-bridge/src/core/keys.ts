import type { DetectedTrack } from "./types";

function normalizePart(value: string): string {
  return value.normalize("NFKC").toLowerCase().replace(/\s+/gu, " ").trim();
}

export function trackKey(track: DetectedTrack): string {
  return `${normalizePart(track.artist)}\u0000${normalizePart(track.title)}`;
}

export function sameMetadata(a: DetectedTrack, b: DetectedTrack): boolean {
  return (
    a.album === b.album &&
    a.bpm === b.bpm &&
    a.key === b.key &&
    a.deck === b.deck &&
    a.startedAt === b.startedAt &&
    a.durationSec === b.durationSec &&
    a.artworkUrl === b.artworkUrl
  );
}

export function stripTrailingNul(text: string): string {
  let end = text.length;
  while (end > 0 && text.charCodeAt(end - 1) === 0) end -= 1;
  return text.slice(0, end);
}

function replaceControlCharacters(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.charCodeAt(0);
    out += code < 32 || code === 127 ? " " : char;
  }
  return out;
}

export function cleanText(value: unknown, maxLength = 200): string {
  if (typeof value !== "string") return "";
  return replaceControlCharacters(value).replace(/\s+/gu, " ").trim().slice(0, maxLength);
}

export function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function compactTrack(input: {
  title: unknown;
  artist: unknown;
  album?: unknown;
  bpm?: unknown;
  key?: unknown;
  deck?: unknown;
  startedAt?: unknown;
  durationSec?: unknown;
  artworkUrl?: unknown;
}): DetectedTrack | null {
  const title = cleanText(input.title);
  if (title.length === 0) return null;
  const track: DetectedTrack = { title, artist: cleanText(input.artist) };
  const album = cleanText(input.album);
  if (album) track.album = album;
  const bpm = finiteNumber(input.bpm);
  if (bpm !== undefined && bpm > 0) track.bpm = Math.round(bpm * 100) / 100;
  const key = cleanText(input.key, 16);
  if (key) track.key = key;
  const deck = cleanText(input.deck, 16);
  if (deck) track.deck = deck;
  const startedAt = finiteNumber(input.startedAt);
  if (startedAt !== undefined) track.startedAt = startedAt;
  const durationSec = finiteNumber(input.durationSec);
  if (durationSec !== undefined && durationSec > 0) track.durationSec = Math.round(durationSec);
  const artworkUrl = cleanText(input.artworkUrl, 2000);
  if (artworkUrl) track.artworkUrl = artworkUrl;
  return track;
}
