import { createAdapterManager } from "@joymusic/dj-bridge";
import type {
  AdapterManager,
  SimulatorAdapter,
  NowPlayingAdapter,
  NowPlayingEvent,
  Timers,
  Clock,
} from "@joymusic/dj-bridge";
import type { AdaptersState } from "../common/bridge";
import { adapterIds } from "../common/settings";
import type { AdapterId, AdapterSettings } from "../common/settings";
import type { AdapterFactory } from "./environment";
import { createTopic } from "./topic";

export interface AdapterHostOptions {
  factory: AdapterFactory;
  clock?: Clock;
  timers?: Timers;
  debounceMs?: number;
  clearAfterMs?: number;
  onError?: (adapterId: string, error: unknown) => void;
}

const emptyState: AdaptersState = { adapters: [], detected: null };

export function createAdapterHost(options: AdapterHostOptions) {
  const manager: AdapterManager = createAdapterManager({
    clock: options.clock,
    timers: options.timers,
    debounceMs: options.debounceMs,
    clearAfterMs: options.clearAfterMs,
    onError: options.onError,
  });
  const topic = createTopic<AdaptersState>(emptyState);
  const applied = new Map<AdapterId, string>();
  const registered = new Map<AdapterId, NowPlayingAdapter>();
  const listeners = new Set<(event: NowPlayingEvent) => void>();
  let simulator: SimulatorAdapter | null = null;
  let queue: Promise<void> = Promise.resolve();

  const refresh = () => {
    topic.update((current) => ({
      ...current,
      adapters: manager
        .list()
        .filter((info) => registered.has(info.id as AdapterId))
        .map((info) => ({ ...info })),
    }));
  };

  manager.on("status", refresh);
  manager.on("nowPlaying", (event) => {
    topic.update((current) => ({
      ...current,
      detected: { adapterId: event.adapterId, track: event.track, at: event.at },
    }));
    refresh();
    for (const listener of [...listeners]) listener(event);
  });

  const configFor = (id: AdapterId, settings: AdapterSettings): string => {
    const { enabled: _enabled, ...rest } = settings[id];
    return JSON.stringify(rest);
  };

  const reconcileOne = async (id: AdapterId, settings: AdapterSettings) => {
    const enabled = settings[id].enabled;
    const signature = configFor(id, settings);
    const known = registered.has(id);
    if (known && applied.get(id) !== signature) {
      await manager.unregister(id);
      registered.delete(id);
    }
    if (!registered.has(id)) {
      const adapter = options.factory(id, settings);
      if (!adapter) return;
      manager.register(adapter);
      registered.set(id, adapter);
      applied.set(id, signature);
      if (id === "simulator") simulator = adapter as SimulatorAdapter;
    }
    if (enabled && !manager.isEnabled(id)) await manager.enable(id);
    if (!enabled && manager.isEnabled(id)) await manager.disable(id);
  };

  return {
    topic,
    reconcile(settings: AdapterSettings): Promise<void> {
      queue = queue
        .catch(() => undefined)
        .then(async () => {
          for (const id of adapterIds) await reconcileOne(id, settings);
          refresh();
        });
      return queue;
    },
    current: () => manager.current(),
    onNowPlaying(listener: (event: NowPlayingEvent) => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    advanceSimulator() {
      simulator?.advance();
    },
    async dispose() {
      listeners.clear();
      await queue.catch(() => undefined);
      await manager.dispose();
    },
  };
}

export type AdapterHost = ReturnType<typeof createAdapterHost>;
