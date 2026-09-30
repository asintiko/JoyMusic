import { createStatusHolder, systemClock, systemTimers } from "../core/timers";
import type { StatusHolder } from "../core/timers";
import type {
  AdapterStatus,
  Clock,
  NowPlayingAdapter,
  NowPlayingSink,
  TimerHandle,
  Timers,
} from "../core/types";
import type { NowPlayingSource } from "@joymusic/shared";

export interface FileEntry {
  name: string;
  path: string;
  mtimeMs: number;
  size: number;
}

export interface FileSystemLike {
  listFiles(directory: string): Promise<FileEntry[] | null>;
  readFile(path: string): Promise<Uint8Array | null>;
}

export interface PollContext {
  sink: NowPlayingSink;
  holder: StatusHolder;
  clock: Clock;
}

export interface PollingAdapterOptions {
  id: string;
  label: string;
  source: NowPlayingSource;
  pollMs: number;
  clock?: Clock;
  timers?: Timers;
  poll(context: PollContext): Promise<void>;
  reset?(): void;
}

export function createPollingAdapter(options: PollingAdapterOptions): NowPlayingAdapter {
  const clock = options.clock ?? systemClock;
  const timers = options.timers ?? systemTimers;
  const holder = createStatusHolder(clock);
  let timer: TimerHandle | null = null;
  let busy = false;
  let running = false;

  const tick = async (sink: NowPlayingSink) => {
    if (busy || !running) return;
    busy = true;
    try {
      await options.poll({ sink, holder, clock });
    } catch (error) {
      holder.set("error", error instanceof Error ? error.message : String(error));
    } finally {
      busy = false;
    }
  };

  return {
    id: options.id,
    label: options.label,
    source: options.source,
    async start(sink) {
      if (running) return;
      running = true;
      options.reset?.();
      holder.bind(sink);
      holder.set("starting");
      await tick(sink);
      if (!running) return;
      timer = timers.every(options.pollMs, () => {
        void tick(sink);
      });
    },
    async stop() {
      running = false;
      timer?.cancel();
      timer = null;
      holder.bind(null);
      holder.set("stopped");
    },
    status: (): AdapterStatus => holder.get(),
  };
}

export function newestFile(
  files: readonly FileEntry[],
  extensions: readonly string[],
): FileEntry | null {
  let best: FileEntry | null = null;
  for (const file of files) {
    const lower = file.name.toLowerCase();
    if (!extensions.some((extension) => lower.endsWith(extension))) continue;
    if (best === null || file.mtimeMs > best.mtimeMs) best = file;
  }
  return best;
}

export async function firstExistingDirectory(
  fs: FileSystemLike,
  directories: readonly string[],
): Promise<{ directory: string; files: FileEntry[] } | null> {
  for (const directory of directories) {
    const files = await fs.listFiles(directory);
    if (files !== null) return { directory, files };
  }
  return null;
}

export function decodeUtf8(bytes: Uint8Array): string {
  const text = new TextDecoder("utf-8").decode(bytes);
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}
