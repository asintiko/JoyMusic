import { systemClock, systemTimers } from "../../core/timers";
import type { Clock, NowPlayingAdapter, Timers } from "../../core/types";
import { decodeUtf8, createPollingAdapter, firstExistingDirectory, newestFile } from "../io";
import type { FileSystemLike } from "../io";
import { compileTrackTemplate, defaultTextTemplate } from "../textfile/template";
import { parseVirtualDjHistory } from "./parser";

export interface VirtualDjAdapterOptions {
  historyDirectories: readonly string[];
  nowPlayingFile?: { path: string; template?: string };
  pollMs?: number;
  fs: FileSystemLike;
  clock?: Clock;
  timers?: Timers;
}

interface Seen {
  path: string;
  mtimeMs: number;
  size: number;
}

export function createVirtualDjAdapter(options: VirtualDjAdapterOptions): NowPlayingAdapter {
  const clock = options.clock ?? systemClock;
  const fileTemplate = options.nowPlayingFile
    ? compileTrackTemplate(options.nowPlayingFile.template ?? defaultTextTemplate)
    : null;
  let seen: Seen | null = null;
  let lastFileText: string | null = null;

  return createPollingAdapter({
    id: "virtualdj",
    label: "VirtualDJ",
    source: "virtualdj",
    pollMs: options.pollMs ?? 1000,
    clock,
    timers: options.timers ?? systemTimers,
    reset: () => {
      seen = null;
      lastFileText = null;
    },
    async poll({ sink, holder }) {
      let activity: string | null = null;

      if (options.nowPlayingFile && fileTemplate) {
        const bytes = await options.fs.readFile(options.nowPlayingFile.path);
        if (bytes !== null) {
          const text = decodeUtf8(bytes);
          if (text !== lastFileText) {
            lastFileText = text;
            const track = fileTemplate.parse(text);
            if (track) {
              track.startedAt = clock.now();
              sink.track(track);
            } else if (text.trim().length === 0) {
              sink.track(null);
            }
          }
          activity = options.nowPlayingFile.path;
        }
      }

      const found = await firstExistingDirectory(options.fs, options.historyDirectories);
      if (found === null) {
        if (activity === null) {
          holder.set("waiting", "VirtualDJ History folder not found");
        } else {
          holder.set("active", activity);
        }
        return;
      }
      const newest = newestFile(found.files, [".m3u", ".m3u8", ".txt"]);
      if (newest === null) {
        holder.set(
          activity === null ? "waiting" : "active",
          activity ?? "No history file in the folder",
        );
        return;
      }
      holder.set("active", newest.path);
      if (
        seen !== null &&
        seen.path === newest.path &&
        seen.mtimeMs === newest.mtimeMs &&
        seen.size === newest.size
      ) {
        return;
      }
      seen = { path: newest.path, mtimeMs: newest.mtimeMs, size: newest.size };
      const bytes = await options.fs.readFile(newest.path);
      if (bytes === null) return;
      const entries = parseVirtualDjHistory(decodeUtf8(bytes));
      const last = entries.at(-1);
      if (last) sink.track({ ...last.track, startedAt: last.playedAt ?? clock.now() });
    },
  });
}
