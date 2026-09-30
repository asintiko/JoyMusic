import { outboxFileSchema } from "../common/commands";
import type { OutboxCommand, OutboxEntry, OutboxState } from "../common/commands";
import { emptyOutboxState } from "../common/commands";
import { createTopic } from "./topic";

export type FailureClass = "retry" | "drop" | "halt";

export interface OutboxOptions {
  load(): Promise<string | null>;
  save(text: string): Promise<void>;
  execute(command: OutboxCommand): Promise<void>;
  classify(error: unknown): FailureClass;
  now(): number;
  createId(): string;
  maxAgeMs?: number;
}

export interface FlushResult {
  sent: number;
  dropped: number;
  stopped: "offline" | "halted" | null;
}

function sameSession(left: OutboxCommand, right: OutboxCommand): boolean {
  return "sessionId" in left && "sessionId" in right && left.sessionId === right.sessionId;
}

function replaces(existing: OutboxCommand, incoming: OutboxCommand): boolean {
  if (!sameSession(existing, incoming)) return false;
  if (incoming.kind === "reorder") return existing.kind === "reorder";
  if (incoming.kind === "nowplaying.set" || incoming.kind === "nowplaying.clear") {
    return existing.kind === "nowplaying.set" || existing.kind === "nowplaying.clear";
  }
  return false;
}

export function createOutbox(options: OutboxOptions) {
  const maxAgeMs = options.maxAgeMs ?? 6 * 60 * 60_000;
  const topic = createTopic<OutboxState>(emptyOutboxState);
  let entries: OutboxEntry[] = [];
  let flushing: Promise<FlushResult> | null = null;
  let lastSkipped: OutboxState["lastSkipped"] = null;
  let writing: Promise<void> = Promise.resolve();

  const publish = () => {
    topic.set({
      pending: entries.length,
      flushing: flushing !== null,
      entries: entries.map((entry) => ({
        id: entry.id,
        kind: entry.command.kind,
        command: entry.command,
        createdAt: entry.createdAt,
        attempts: entry.attempts,
      })),
      lastSkipped,
    });
  };

  const persist = () => {
    const text = JSON.stringify({ version: 1, entries });
    writing = writing.catch(() => undefined).then(() => options.save(text));
    return writing;
  };

  const runFlush = async (): Promise<FlushResult> => {
    const result: FlushResult = { sent: 0, dropped: 0, stopped: null };
    for (;;) {
      const head = entries[0];
      if (!head) break;
      if (options.now() - head.createdAt > maxAgeMs) {
        entries = entries.slice(1);
        result.dropped += 1;
        lastSkipped = {
          id: head.id,
          kind: head.command.kind,
          reason: "expired",
          at: options.now(),
        };
        await persist();
        publish();
        continue;
      }
      try {
        await options.execute(head.command);
        entries = entries.filter((entry) => entry.id !== head.id);
        result.sent += 1;
        await persist();
        publish();
      } catch (error) {
        const failure = options.classify(error);
        if (failure === "drop") {
          entries = entries.filter((entry) => entry.id !== head.id);
          result.dropped += 1;
          lastSkipped = {
            id: head.id,
            kind: head.command.kind,
            reason: error instanceof Error ? error.message : "rejected",
            at: options.now(),
          };
          await persist();
          publish();
          continue;
        }
        entries = entries.map((entry) =>
          entry.id === head.id ? { ...entry, attempts: entry.attempts + 1 } : entry,
        );
        await persist();
        result.stopped = failure === "retry" ? "offline" : "halted";
        break;
      }
    }
    return result;
  };

  return {
    topic,
    async init() {
      const text = await options.load();
      if (!text) return;
      try {
        const parsed = outboxFileSchema.safeParse(JSON.parse(text));
        entries = parsed.success ? parsed.data.entries : [];
      } catch {
        entries = [];
      }
      publish();
    },
    size: () => entries.length,
    isFlushing: () => flushing !== null,
    async enqueue(command: OutboxCommand): Promise<OutboxEntry> {
      const kept = entries.filter((entry, index) => {
        if (flushing !== null && index === 0) return true;
        return !replaces(entry.command, command);
      });
      const entry: OutboxEntry = {
        id: options.createId(),
        command,
        createdAt: options.now(),
        attempts: 0,
      };
      entries = [...kept, entry];
      await persist();
      publish();
      return entry;
    },
    contains: (id: string) => entries.some((entry) => entry.id === id),
    commands: (): OutboxCommand[] => entries.map((entry) => entry.command),
    flush(): Promise<FlushResult> {
      if (flushing) return flushing;
      flushing = runFlush().finally(() => {
        flushing = null;
        publish();
      });
      publish();
      return flushing;
    },
    async clear() {
      entries = [];
      await persist();
      publish();
    },
  };
}

export type Outbox = ReturnType<typeof createOutbox>;
