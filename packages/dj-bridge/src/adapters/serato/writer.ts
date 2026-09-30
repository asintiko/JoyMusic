import { seratoFieldIds, seratoStringFields, seratoVersionString } from "./format";

export interface SeratoFixtureEntry {
  row?: number;
  title: string;
  artist?: string;
  album?: string;
  bpm?: number;
  key?: string;
  length?: string;
  path?: string;
  deck?: number;
  startedAtSec?: number;
  endedAtSec?: number;
  played?: boolean;
  ejected?: boolean;
  playTimeSec?: number;
  extraFields?: readonly { id: number; data: Uint8Array }[];
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function uint32(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
}

function ascii(tag: string): Uint8Array {
  return Uint8Array.from(tag, (char) => char.charCodeAt(0));
}

export function encodeUtf16Be(text: string): Uint8Array {
  const out = new Uint8Array(text.length * 2);
  const view = new DataView(out.buffer);
  for (let index = 0; index < text.length; index += 1) {
    view.setUint16(index * 2, text.charCodeAt(index), false);
  }
  return out;
}

function encodeUnsigned(value: number, width: number): Uint8Array {
  const out = new Uint8Array(width);
  let rest = value;
  for (let index = width - 1; index >= 0; index -= 1) {
    out[index] = rest % 256;
    rest = Math.floor(rest / 256);
  }
  return out;
}

export function seratoChunk(tag: string, data: Uint8Array): Uint8Array {
  return concat([ascii(tag), uint32(data.length), data]);
}

function field(id: number, data: Uint8Array): Uint8Array {
  return concat([uint32(id), uint32(data.length), data]);
}

function stringField(id: number, value: string): Uint8Array {
  if (!seratoStringFields.has(id)) throw new Error(`Field ${id} is not a string field`);
  return field(id, encodeUtf16Be(value));
}

function intField(id: number, value: number, width = 4): Uint8Array {
  return field(id, encodeUnsigned(value, width));
}

export function buildSeratoEntry(entry: SeratoFixtureEntry, index: number): Uint8Array {
  const parts: Uint8Array[] = [intField(seratoFieldIds.row, entry.row ?? index + 1)];
  if (entry.path) {
    parts.push(stringField(seratoFieldIds.fullPath, entry.path));
    parts.push(stringField(seratoFieldIds.location, entry.path));
  }
  parts.push(stringField(seratoFieldIds.title, entry.title));
  if (entry.artist !== undefined) parts.push(stringField(seratoFieldIds.artist, entry.artist));
  if (entry.album !== undefined) parts.push(stringField(seratoFieldIds.album, entry.album));
  if (entry.length !== undefined) parts.push(stringField(seratoFieldIds.length, entry.length));
  if (entry.bpm !== undefined) parts.push(intField(seratoFieldIds.bpm, entry.bpm));
  if (entry.startedAtSec !== undefined) {
    parts.push(intField(seratoFieldIds.startTime, entry.startedAtSec));
  }
  if (entry.endedAtSec !== undefined)
    parts.push(intField(seratoFieldIds.endTime, entry.endedAtSec));
  if (entry.deck !== undefined) parts.push(intField(seratoFieldIds.deck, entry.deck));
  if (entry.playTimeSec !== undefined) {
    parts.push(intField(seratoFieldIds.playTime, entry.playTimeSec));
  }
  if (entry.played !== undefined) {
    parts.push(intField(seratoFieldIds.played, entry.played ? 1 : 0, 1));
  }
  if (entry.key !== undefined) parts.push(stringField(seratoFieldIds.key, entry.key));
  if (entry.ejected !== undefined) {
    parts.push(intField(seratoFieldIds.ejected, entry.ejected ? 1 : 0, 1));
  }
  for (const extra of entry.extraFields ?? []) parts.push(field(extra.id, extra.data));
  return seratoChunk("oent", seratoChunk("adat", concat(parts)));
}

export function buildSeratoSession(entries: readonly SeratoFixtureEntry[]): Uint8Array {
  return concat([
    seratoChunk("vrsn", encodeUtf16Be(seratoVersionString)),
    ...entries.map((entry, index) => buildSeratoEntry(entry, index)),
  ]);
}
