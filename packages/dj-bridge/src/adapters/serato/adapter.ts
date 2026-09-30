import { systemClock, systemTimers } from "../../core/timers";
import type { Clock, NowPlayingAdapter, Timers } from "../../core/types";
import { createPollingAdapter, firstExistingDirectory, newestFile } from "../io";
import type { FileSystemLike } from "../io";
import { parseSeratoSession, seratoEntriesToDecks } from "./parser";

export interface SeratoAdapterOptions {
  sessionDirectories: readonly string[];
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

export function createSeratoAdapter(options: SeratoAdapterOptions): NowPlayingAdapter {
  let seen: Seen | null = null;
  let activeDecks = new Set<string>();

  return createPollingAdapter({
    id: "serato",
    label: "Serato DJ Pro",
    source: "serato",
    pollMs: options.pollMs ?? 1000,
    clock: options.clock ?? systemClock,
    timers: options.timers ?? systemTimers,
    reset: () => {
      seen = null;
      activeDecks = new Set();
    },
    async poll({ sink, holder }) {
      const found = await firstExistingDirectory(options.fs, options.sessionDirectories);
      if (found === null) {
        holder.set("waiting", "Serato History/Sessions folder not found");
        return;
      }
      const newest = newestFile(found.files, [".session"]);
      if (newest === null) {
        holder.set("waiting", "No .session file yet");
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
      const bytes = await options.fs.readFile(newest.path);
      if (bytes === null) return;
      seen = { path: newest.path, mtimeMs: newest.mtimeMs, size: newest.size };
      const session = parseSeratoSession(bytes);
      const decks = seratoEntriesToDecks(session.entries);
      const present = new Set(decks.map((deck) => deck.deck));
      for (const deck of activeDecks) {
        if (!present.has(deck)) sink.removeDeck(deck);
      }
      for (const deck of decks) sink.deck(deck);
      activeDecks = present;
    },
  });
}
