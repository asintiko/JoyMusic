import { cleanText, compactTrack } from "../../core/keys";
import type { DetectedTrack } from "../../core/types";
import { splitArtistTitle } from "../textfile/template";

export interface VirtualDjEntry {
  track: DetectedTrack;
  path: string | null;
  playedAt: number | null;
}

function parseVdjTags(payload: string): Record<string, string> {
  const tags: Record<string, string> = {};
  for (const match of payload.matchAll(/<([A-Za-z0-9_]+)>([\s\S]*?)<\/\1>/gu)) {
    tags[(match[1] as string).toLowerCase()] = match[2] as string;
  }
  return tags;
}

function epochSeconds(value: string | undefined): number | null {
  if (value === undefined) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 1_000_000_000 && parsed < 100_000_000_000
    ? parsed * 1000
    : null;
}

function titleFromPath(path: string): { artist: string; title: string } | null {
  const file = path.split(/[\\/]/u).at(-1) ?? "";
  const stem = file.replace(/\.[A-Za-z0-9]{1,5}$/u, "");
  return splitArtistTitle(stem);
}

interface Pending {
  tags: Record<string, string>;
  infDuration: number | null;
  infText: string | null;
}

function finalize(pending: Pending, path: string | null): VirtualDjEntry | null {
  const { tags } = pending;
  let artist = cleanText(tags.artist);
  let title = cleanText(tags.title);
  if (title.length === 0 && pending.infText !== null) {
    const split = splitArtistTitle(pending.infText);
    if (split) {
      title = split.title;
      if (artist.length === 0) artist = split.artist;
    }
  }
  if (title.length === 0 && path !== null) {
    const split = titleFromPath(path);
    if (split) {
      title = split.title;
      if (artist.length === 0) artist = split.artist;
    }
  }
  const songLength = Number.parseFloat(tags.songlength ?? "");
  const infDuration =
    pending.infDuration !== null && pending.infDuration > 0 ? pending.infDuration : undefined;
  const playedAt = epochSeconds(tags.lastplaytime) ?? epochSeconds(tags.time);
  const track = compactTrack({
    title,
    artist,
    album: tags.album,
    bpm: Number.parseFloat(tags.bpm ?? ""),
    key: tags.key,
    deck: tags.deck,
    startedAt: playedAt ?? undefined,
    durationSec: Number.isFinite(songLength) && songLength > 0 ? songLength : infDuration,
  });
  if (track === null) return null;
  return { track, path, playedAt };
}

export function parseVirtualDjHistory(text: string): VirtualDjEntry[] {
  const entries: VirtualDjEntry[] = [];
  let pending: Pending | null = null;
  const flush = (path: string | null) => {
    if (pending === null) return;
    const entry = finalize(pending, path);
    if (entry) entries.push(entry);
    pending = null;
  };
  for (const rawLine of text.split(/\r\n?|\n/u)) {
    const line = rawLine.trim();
    if (line.length === 0) continue;
    if (line.startsWith("#EXTVDJ:")) {
      if (pending !== null && Object.keys(pending.tags).length > 0) flush(null);
      pending ??= { tags: {}, infDuration: null, infText: null };
      Object.assign(pending.tags, parseVdjTags(line.slice("#EXTVDJ:".length)));
    } else if (line.startsWith("#EXTINF:")) {
      const body = line.slice("#EXTINF:".length);
      const comma = body.indexOf(",");
      pending ??= { tags: {}, infDuration: null, infText: null };
      if (comma >= 0) {
        const duration = Number.parseFloat(body.slice(0, comma));
        pending.infDuration = Number.isFinite(duration) ? duration : null;
        pending.infText = body.slice(comma + 1);
      }
    } else if (line.startsWith("#")) {
      continue;
    } else {
      pending ??= { tags: {}, infDuration: null, infText: null };
      flush(line);
    }
  }
  flush(null);
  return entries;
}
