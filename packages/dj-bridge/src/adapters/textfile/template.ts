import type { DetectedTrack } from "../../core/types";
import { compactTrack } from "../../core/keys";

const placeholderNames = ["artist", "title", "album", "bpm", "key"] as const;
type PlaceholderName = (typeof placeholderNames)[number];

export interface TrackTemplate {
  source: string;
  parse(text: string): DetectedTrack | null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export function compileTrackTemplate(template: string): TrackTemplate {
  const pattern = /\{(\w+)\}/gu;
  const names: PlaceholderName[] = [];
  let source = "";
  let last = 0;
  for (const match of template.matchAll(pattern)) {
    const name = match[1] as string;
    if (!(placeholderNames as readonly string[]).includes(name)) {
      throw new Error(`Unknown placeholder {${name}}`);
    }
    if (names.includes(name as PlaceholderName)) throw new Error(`Duplicate placeholder {${name}}`);
    names.push(name as PlaceholderName);
    source += escapeRegExp(template.slice(last, match.index));
    source += "(.+?)";
    last = match.index + match[0].length;
  }
  source += escapeRegExp(template.slice(last));
  if (!names.includes("title")) throw new Error("Template must contain {title}");
  const regex = new RegExp(`^${source}$`, "su");
  const multiline = template.includes("\n");
  return {
    source: template,
    parse(text) {
      const normalized = text.replace(/\r\n?/gu, "\n").trim();
      if (normalized.length === 0) return null;
      const subject = multiline
        ? normalized
        : (normalized
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .at(-1) ?? "");
      const found = regex.exec(subject);
      if (!found) return null;
      const values: Partial<Record<PlaceholderName, string>> = {};
      names.forEach((name, index) => {
        values[name] = found[index + 1];
      });
      const bpm = values.bpm === undefined ? undefined : Number.parseFloat(values.bpm);
      return compactTrack({
        title: values.title,
        artist: values.artist ?? "",
        album: values.album,
        bpm,
        key: values.key,
      });
    },
  };
}

export function splitArtistTitle(text: string): { artist: string; title: string } | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const separators = [" - ", " – ", " — ", " | "];
  for (const separator of separators) {
    const index = trimmed.indexOf(separator);
    if (index > 0 && index + separator.length < trimmed.length) {
      return {
        artist: trimmed.slice(0, index).trim(),
        title: trimmed.slice(index + separator.length).trim(),
      };
    }
  }
  return { artist: "", title: trimmed };
}
export const defaultTextTemplate = "{artist} - {title}";
