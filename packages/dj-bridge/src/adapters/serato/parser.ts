import { cleanText, compactTrack, stripTrailingNul } from "../../core/keys";
import type { DeckState, DetectedTrack } from "../../core/types";
import { seratoFieldIds, seratoStringFields } from "./format";

export interface SeratoEntry {
  row: number | null;
  track: DetectedTrack;
  path: string | null;
  deck: number | null;
  startedAt: number | null;
  endedAt: number | null;
  played: boolean | null;
  ejected: boolean;
  playTimeSec: number | null;
}

export interface SeratoSession {
  version: string | null;
  entries: SeratoEntry[];
  truncated: boolean;
}

function readTag(view: DataView, offset: number): string {
  return String.fromCharCode(
    view.getUint8(offset),
    view.getUint8(offset + 1),
    view.getUint8(offset + 2),
    view.getUint8(offset + 3),
  );
}

export function decodeUtf16Be(bytes: Uint8Array): string {
  const units: number[] = [];
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    units.push(((bytes[index] as number) << 8) | (bytes[index + 1] as number));
  }
  let text = "";
  for (let start = 0; start < units.length; start += 4096) {
    text += String.fromCharCode(...units.slice(start, start + 4096));
  }
  return stripTrailingNul(text);
}

function decodeUnsigned(bytes: Uint8Array): number | null {
  if (bytes.length === 0 || bytes.length > 6) return null;
  let value = 0;
  for (const byte of bytes) value = value * 256 + byte;
  return value;
}

function parseDurationText(text: string): number | undefined {
  const match = /^(?:(\d+):)?(\d+):(\d+)(?:[.,]\d+)?$/u.exec(text.trim());
  if (!match) return undefined;
  const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
  return (
    hours * 3600 +
    Number.parseInt(match[2] as string, 10) * 60 +
    Number.parseInt(match[3] as string, 10)
  );
}

interface RawFields {
  strings: Map<number, string>;
  numbers: Map<number, number>;
}

function readAdat(bytes: Uint8Array, start: number, end: number): RawFields {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const fields: RawFields = { strings: new Map(), numbers: new Map() };
  let offset = start;
  while (offset + 8 <= end) {
    const id = view.getUint32(offset, false);
    const length = view.getUint32(offset + 4, false);
    const dataStart = offset + 8;
    if (dataStart + length > end) break;
    const data = bytes.subarray(dataStart, dataStart + length);
    if (seratoStringFields.has(id)) {
      fields.strings.set(id, decodeUtf16Be(data));
    } else {
      const value = decodeUnsigned(data);
      if (value !== null) fields.numbers.set(id, value);
    }
    offset = dataStart + length;
  }
  return fields;
}

function toEntry(fields: RawFields): SeratoEntry | null {
  const { strings, numbers } = fields;
  const startedAtSec = numbers.get(seratoFieldIds.startTime);
  const endedAtSec = numbers.get(seratoFieldIds.endTime);
  const deck = numbers.get(seratoFieldIds.deck) ?? null;
  const startedAt = startedAtSec === undefined ? null : startedAtSec * 1000;
  const bpm = numbers.get(seratoFieldIds.bpm);
  const track = compactTrack({
    title: strings.get(seratoFieldIds.title),
    artist: strings.get(seratoFieldIds.artist),
    album: strings.get(seratoFieldIds.album),
    bpm: bpm !== undefined && bpm > 0 ? bpm : undefined,
    key: strings.get(seratoFieldIds.key),
    deck: deck === null ? undefined : String(deck),
    startedAt: startedAt ?? undefined,
    durationSec: parseDurationText(strings.get(seratoFieldIds.length) ?? ""),
  });
  if (track === null) return null;
  const played = numbers.get(seratoFieldIds.played);
  const path = cleanText(
    strings.get(seratoFieldIds.fullPath) ?? strings.get(seratoFieldIds.location),
    1000,
  );
  return {
    row: numbers.get(seratoFieldIds.row) ?? null,
    track,
    path: path.length > 0 ? path : null,
    deck,
    startedAt,
    endedAt: endedAtSec === undefined ? null : endedAtSec * 1000,
    played: played === undefined ? null : played !== 0,
    ejected: (numbers.get(seratoFieldIds.ejected) ?? 0) !== 0,
    playTimeSec: numbers.get(seratoFieldIds.playTime) ?? null,
  };
}

export function parseSeratoSession(bytes: Uint8Array): SeratoSession {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const session: SeratoSession = { version: null, entries: [], truncated: false };
  let offset = 0;
  while (offset + 8 <= bytes.length) {
    const tag = readTag(view, offset);
    const length = view.getUint32(offset + 4, false);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd > bytes.length) {
      session.truncated = true;
      break;
    }
    if (tag === "vrsn") {
      session.version = decodeUtf16Be(bytes.subarray(dataStart, dataEnd));
    } else if (tag === "oent") {
      let inner = dataStart;
      while (inner + 8 <= dataEnd) {
        const innerTag = readTag(view, inner);
        const innerLength = view.getUint32(inner + 4, false);
        const innerStart = inner + 8;
        const innerEnd = innerStart + innerLength;
        if (innerEnd > dataEnd) break;
        if (innerTag === "adat") {
          const entry = toEntry(readAdat(bytes, innerStart, innerEnd));
          if (entry) session.entries.push(entry);
        }
        inner = innerEnd;
      }
    }
    offset = dataEnd;
  }
  if (offset < bytes.length && !session.truncated && bytes.length - offset < 8) {
    session.truncated = true;
  }
  return session;
}

function entryOrder(entry: SeratoEntry, index: number): number {
  return (entry.startedAt ?? 0) * 1000 + (entry.row ?? index);
}

export function seratoEntriesToDecks(entries: readonly SeratoEntry[]): DeckState[] {
  const latestByDeck = new Map<string, { entry: SeratoEntry; order: number }>();
  entries.forEach((entry, index) => {
    const deck = String(entry.deck ?? 1);
    const order = entryOrder(entry, index) + index / 1000;
    const existing = latestByDeck.get(deck);
    if (!existing || order >= existing.order) latestByDeck.set(deck, { entry, order });
  });
  const decks: DeckState[] = [];
  for (const [deck, { entry }] of latestByDeck) {
    if (entry.endedAt !== null || entry.ejected) continue;
    const state: DeckState = {
      deck,
      track: { ...entry.track, deck },
      playing: entry.played === null ? true : entry.played,
    };
    if (entry.startedAt !== null) state.loadedAt = entry.startedAt;
    decks.push(state);
  }
  return decks;
}
