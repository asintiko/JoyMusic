import type { Clock, DeckState, NowPlayingSink, TimerHandle, Timers } from "./core/types";
import type { FileEntry, FileSystemLike } from "./adapters/io";

export interface ManualTime extends Clock, Timers {
  advance(ms: number): void;
  pending(): number;
}

export function createManualTime(start = 1_700_000_000_000): ManualTime {
  let now = start;
  let sequence = 0;
  const tasks = new Map<
    number,
    { due: number; task: () => void; interval: number | null; order: number }
  >();
  const add = (ms: number, task: () => void, interval: number | null): TimerHandle => {
    sequence += 1;
    const id = sequence;
    tasks.set(id, { due: now + ms, task, interval, order: id });
    return { cancel: () => void tasks.delete(id) };
  };
  return {
    now: () => now,
    after: (ms, task) => add(ms, task, null),
    every: (ms, task) => add(ms, task, ms),
    pending: () => tasks.size,
    advance(ms) {
      const target = now + ms;
      for (;;) {
        let next: { id: number; due: number; order: number } | null = null;
        for (const [id, entry] of tasks) {
          if (entry.due > target) continue;
          if (
            next === null ||
            entry.due < next.due ||
            (entry.due === next.due && entry.order < next.order)
          ) {
            next = { id, due: entry.due, order: entry.order };
          }
        }
        if (next === null) break;
        const entry = tasks.get(next.id);
        if (!entry) break;
        now = Math.max(now, entry.due);
        if (entry.interval === null) tasks.delete(next.id);
        else entry.due += Math.max(1, entry.interval);
        entry.task();
      }
      now = target;
    },
  };
}

export interface RecordingSink extends NowPlayingSink {
  decks: Map<string, DeckState>;
  calls: string[];
}

export function createRecordingSink(): RecordingSink {
  const decks = new Map<string, DeckState>();
  const calls: string[] = [];
  return {
    decks,
    calls,
    deck(state) {
      decks.set(state.deck, state);
      calls.push(`deck:${state.deck}:${state.track?.title ?? "-"}`);
    },
    removeDeck(deck) {
      decks.delete(deck);
      calls.push(`remove:${deck}`);
    },
    track(track) {
      calls.push(`track:${track?.title ?? "-"}`);
    },
    status(state) {
      calls.push(`status:${state}`);
    },
  };
}

export interface MemoryFileSystem extends FileSystemLike {
  files: Map<string, { data: Uint8Array; mtimeMs: number }>;
  directories: Set<string>;
  write(path: string, data: Uint8Array | string, mtimeMs: number): void;
}

export function createMemoryFileSystem(): MemoryFileSystem {
  const files = new Map<string, { data: Uint8Array; mtimeMs: number }>();
  const directories = new Set<string>();
  return {
    files,
    directories,
    write(path, data, mtimeMs) {
      const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
      files.set(path, { data: bytes, mtimeMs });
      const slash = path.lastIndexOf("/");
      if (slash > 0) directories.add(path.slice(0, slash));
    },
    async listFiles(directory) {
      if (!directories.has(directory)) return null;
      const entries: FileEntry[] = [];
      for (const [path, file] of files) {
        if (path.slice(0, path.lastIndexOf("/")) !== directory) continue;
        entries.push({
          name: path.slice(path.lastIndexOf("/") + 1),
          path,
          mtimeMs: file.mtimeMs,
          size: file.data.length,
        });
      }
      return entries;
    },
    async readFile(path) {
      return files.get(path)?.data ?? null;
    },
  };
}

export function settle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
