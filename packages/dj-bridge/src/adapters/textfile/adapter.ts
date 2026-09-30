import { systemClock, systemTimers } from "../../core/timers";
import type { Clock, NowPlayingAdapter, Timers } from "../../core/types";
import { createPollingAdapter, decodeUtf8 } from "../io";
import type { FileSystemLike } from "../io";
import { compileTrackTemplate, defaultTextTemplate } from "./template";
export { defaultTextTemplate };

export interface TextFileAdapterOptions {
  id?: string;
  label?: string;
  path: string;
  template?: string;
  pollMs?: number;
  fs: FileSystemLike;
  clock?: Clock;
  timers?: Timers;
}

export function createTextFileAdapter(options: TextFileAdapterOptions): NowPlayingAdapter {
  const template = compileTrackTemplate(options.template ?? defaultTextTemplate);
  const clock = options.clock ?? systemClock;
  let lastText: string | null = null;

  return createPollingAdapter({
    id: options.id ?? "textfile",
    label: options.label ?? "Text file",
    source: "manual",
    pollMs: options.pollMs ?? 1000,
    clock,
    timers: options.timers ?? systemTimers,
    reset: () => {
      lastText = null;
    },
    async poll({ sink, holder }) {
      const bytes = await options.fs.readFile(options.path);
      if (bytes === null) {
        holder.set("waiting", `File not found: ${options.path}`);
        return;
      }
      const text = decodeUtf8(bytes);
      if (text === lastText) return;
      lastText = text;
      const track = template.parse(text);
      if (track === null) {
        if (text.trim().length === 0) {
          sink.track(null);
          holder.set("active", "File is empty");
        } else {
          holder.set("active", "Line does not match the template");
        }
        return;
      }
      track.startedAt = clock.now();
      sink.track(track);
      holder.set("active", options.path);
    },
  });
}
