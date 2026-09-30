import { cleanText, stripTrailingNul } from "../../core/keys";
import { splitArtistTitle } from "../textfile/template";

export interface IcecastRequestHead {
  method: string;
  path: string;
  query: URLSearchParams;
  version: string;
  headers: Map<string, string>;
}

export const maxHeadBytes = 16 * 1024;

export function parseIcecastRequestHead(text: string): IcecastRequestHead | null {
  const lines = text.split(/\r?\n/u);
  const requestLine = lines[0]?.trim() ?? "";
  const match = /^([A-Z]{2,16})\s+(\S{1,2048})\s+(HTTP\/\d\.\d)$/u.exec(requestLine);
  if (!match) return null;
  const target = match[2] as string;
  const queryStart = target.indexOf("?");
  const path = queryStart >= 0 ? target.slice(0, queryStart) : target;
  let query: URLSearchParams;
  try {
    query = new URLSearchParams(queryStart >= 0 ? target.slice(queryStart + 1) : "");
  } catch {
    query = new URLSearchParams();
  }
  const headers = new Map<string, string>();
  for (const line of lines.slice(1)) {
    if (line.length === 0) break;
    const colon = line.indexOf(":");
    if (colon <= 0) continue;
    headers.set(line.slice(0, colon).trim().toLowerCase(), line.slice(colon + 1).trim());
  }
  return {
    method: match[1] as string,
    path,
    query,
    version: match[3] as string,
    headers,
  };
}

export function findHeadEnd(buffer: Uint8Array): number {
  for (let index = 0; index + 3 < buffer.length; index += 1) {
    if (
      buffer[index] === 13 &&
      buffer[index + 1] === 10 &&
      buffer[index + 2] === 13 &&
      buffer[index + 3] === 10
    ) {
      return index + 4;
    }
  }
  for (let index = 0; index + 1 < buffer.length; index += 1) {
    if (buffer[index] === 10 && buffer[index + 1] === 10) return index + 2;
  }
  return -1;
}

export function checkBasicAuth(
  header: string | undefined,
  expected: { user: string; password: string } | null,
): boolean {
  if (expected === null) return true;
  if (!header || !/^basic\s+/iu.test(header)) return false;
  const encoded = header.replace(/^basic\s+/iu, "").trim();
  let decoded: string;
  try {
    decoded = new TextDecoder().decode(
      Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)),
    );
  } catch {
    return false;
  }
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  return (
    decoded.slice(0, separator) === expected.user &&
    decoded.slice(separator + 1) === expected.password
  );
}

export interface SongMetadata {
  artist: string;
  title: string;
}

export function parseSongMetadata(song: string): SongMetadata | null {
  const cleaned = cleanText(song, 400);
  const split = splitArtistTitle(cleaned);
  if (!split || split.title.length === 0) return null;
  return { artist: split.artist.slice(0, 200), title: split.title.slice(0, 200) };
}

export function parseAdminMetadata(head: IcecastRequestHead): {
  mount: string;
  song: SongMetadata | null;
} | null {
  if (head.method !== "GET" || head.path !== "/admin/metadata") return null;
  if (head.query.get("mode") !== "updinfo") return null;
  const mount = head.query.get("mount") ?? "/";
  const raw = head.query.get("song");
  if (raw !== null) return { mount, song: parseSongMetadata(raw) };
  const artist = head.query.get("artist");
  const title = head.query.get("title");
  if (title !== null) {
    return { mount, song: parseSongMetadata(artist ? `${artist} - ${title}` : title) };
  }
  return { mount, song: null };
}

export function parseIcyMetadataBlock(block: Uint8Array): string | null {
  const text = stripTrailingNul(new TextDecoder("utf-8").decode(block));
  const match = /StreamTitle='((?:[^']|'(?!;))*)'/u.exec(text);
  return match ? (match[1] as string) : null;
}

export interface IcyStreamParser {
  push(chunk: Uint8Array): void;
}

export function createIcyStreamParser(
  metaint: number,
  onMetadata: (streamTitle: string) => void,
): IcyStreamParser {
  let audioRemaining = metaint;
  let metaLength = -1;
  let block: number[] = [];
  return {
    push(chunk) {
      let offset = 0;
      while (offset < chunk.length) {
        if (audioRemaining > 0) {
          const take = Math.min(audioRemaining, chunk.length - offset);
          audioRemaining -= take;
          offset += take;
          continue;
        }
        if (metaLength < 0) {
          metaLength = (chunk[offset] as number) * 16;
          offset += 1;
          block = [];
          if (metaLength === 0) {
            metaLength = -1;
            audioRemaining = metaint;
          }
          continue;
        }
        const take = Math.min(metaLength - block.length, chunk.length - offset);
        for (let index = 0; index < take; index += 1) block.push(chunk[offset + index] as number);
        offset += take;
        if (block.length === metaLength) {
          const title = parseIcyMetadataBlock(Uint8Array.from(block));
          if (title !== null) onMetadata(title);
          metaLength = -1;
          audioRemaining = metaint;
        }
      }
    },
  };
}
