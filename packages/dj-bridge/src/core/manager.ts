import { createEmitter } from "./emitter";
import { sameMetadata, trackKey } from "./keys";
import { selectOnAirDeck } from "./onair";
import { systemClock, systemTimers } from "./timers";
import type {
  AdapterInfo,
  AdapterState,
  AdapterStatus,
  Clock,
  DeckState,
  DetectedTrack,
  NowPlayingAdapter,
  NowPlayingEvent,
  NowPlayingSink,
  StatusEvent,
  TimerHandle,
  Timers,
} from "./types";

export interface AdapterManagerOptions {
  debounceMs?: number;
  clearAfterMs?: number;
  clock?: Clock;
  timers?: Timers;
  onError?: (adapterId: string, error: unknown) => void;
}

export interface AdapterManagerEvents extends Record<string, unknown> {
  nowPlaying: NowPlayingEvent;
  status: StatusEvent;
}

export interface AdapterManager {
  register(adapter: NowPlayingAdapter): void;
  unregister(id: string): Promise<void>;
  enable(id: string): Promise<void>;
  disable(id: string): Promise<void>;
  isEnabled(id: string): boolean;
  list(): AdapterInfo[];
  current(): NowPlayingEvent | null;
  on<K extends keyof AdapterManagerEvents>(
    event: K,
    listener: (payload: AdapterManagerEvents[K]) => void,
  ): () => void;
  dispose(): Promise<void>;
}

interface Runtime {
  adapter: NowPlayingAdapter;
  enabled: boolean;
  generation: number;
  decks: Map<string, DeckState>;
  committed: DetectedTrack | null;
  committedAt: number;
  pendingKey: string | null;
  pendingTimer: TimerHandle | null;
  status: AdapterStatus;
}

export function createAdapterManager(options: AdapterManagerOptions = {}): AdapterManager {
  const debounceMs = options.debounceMs ?? 1500;
  const clearAfterMs = options.clearAfterMs ?? Math.max(debounceMs, 4000);
  const clock = options.clock ?? systemClock;
  const timers = options.timers ?? systemTimers;
  const runtimes = new Map<string, Runtime>();
  const emitter = createEmitter<AdapterManagerEvents>();
  let lastEvent: NowPlayingEvent | null = null;

  const reportError = (id: string, error: unknown) => options.onError?.(id, error);

  const setStatus = (runtime: Runtime, state: AdapterState, detail: string | null) => {
    const status: AdapterStatus = { state, detail, since: clock.now() };
    runtime.status = status;
    emitter.emit("status", { adapterId: runtime.adapter.id, status });
  };

  const recomputeGlobal = () => {
    let winner: Runtime | null = null;
    for (const runtime of runtimes.values()) {
      if (!runtime.enabled || runtime.committed === null) continue;
      if (winner === null || runtime.committedAt >= winner.committedAt) winner = runtime;
    }
    const at = clock.now();
    if (winner === null || winner.committed === null) {
      if (lastEvent !== null && lastEvent.track !== null) {
        lastEvent = {
          adapterId: lastEvent.adapterId,
          source: lastEvent.source,
          track: null,
          reason: "cleared",
          at,
        };
        emitter.emit("nowPlaying", lastEvent);
      }
      return;
    }
    const track = winner.committed;
    const previous = lastEvent?.track ?? null;
    if (previous !== null && trackKey(previous) === trackKey(track)) {
      if (sameMetadata(previous, track) && lastEvent?.adapterId === winner.adapter.id) return;
      lastEvent = {
        adapterId: winner.adapter.id,
        source: winner.adapter.source,
        track,
        reason: "metadata",
        at,
      };
      emitter.emit("nowPlaying", lastEvent);
      return;
    }
    lastEvent = {
      adapterId: winner.adapter.id,
      source: winner.adapter.source,
      track,
      reason: "changed",
      at,
    };
    emitter.emit("nowPlaying", lastEvent);
  };

  const commit = (runtime: Runtime, track: DetectedTrack | null) => {
    runtime.pendingTimer?.cancel();
    runtime.pendingTimer = null;
    runtime.pendingKey = null;
    runtime.committed = track;
    runtime.committedAt = clock.now();
    recomputeGlobal();
  };

  const evaluate = (runtime: Runtime) => {
    const candidate = selectOnAirDeck([...runtime.decks.values()])?.track ?? null;
    const committed = runtime.committed;
    const candidateKey = candidate === null ? null : trackKey(candidate);
    const committedKey = committed === null ? null : trackKey(committed);
    if (candidateKey === committedKey) {
      runtime.pendingTimer?.cancel();
      runtime.pendingTimer = null;
      runtime.pendingKey = null;
      if (candidate !== null && committed !== null && !sameMetadata(candidate, committed)) {
        runtime.committed = candidate;
        recomputeGlobal();
      }
      return;
    }
    if (runtime.pendingTimer !== null && runtime.pendingKey === candidateKey) return;
    runtime.pendingTimer?.cancel();
    runtime.pendingTimer = null;
    runtime.pendingKey = candidateKey;
    const wait = candidate === null ? clearAfterMs : debounceMs;
    if (wait <= 0) {
      commit(runtime, candidate);
      return;
    }
    runtime.pendingTimer = timers.after(wait, () => {
      if (!runtimes.has(runtime.adapter.id) || !runtime.enabled) return;
      const latest = selectOnAirDeck([...runtime.decks.values()])?.track ?? null;
      const latestKey = latest === null ? null : trackKey(latest);
      if (latestKey !== runtime.pendingKey) return;
      commit(runtime, latest);
    });
  };

  const createSink = (runtime: Runtime, generation: number): NowPlayingSink => {
    const live = () => runtime.enabled && runtime.generation === generation;
    const putDeck = (state: DeckState) => {
      const previous = runtime.decks.get(state.deck);
      const changedTrack =
        (previous?.track ? trackKey(previous.track) : null) !==
        (state.track ? trackKey(state.track) : null);
      const loadedAt = state.loadedAt ?? (changedTrack ? clock.now() : previous?.loadedAt);
      const next: DeckState = { ...state };
      if (loadedAt !== undefined) next.loadedAt = loadedAt;
      runtime.decks.set(state.deck, next);
    };
    return {
      deck(state) {
        if (!live()) return;
        putDeck(state);
        evaluate(runtime);
      },
      removeDeck(deck) {
        if (!live()) return;
        runtime.decks.delete(deck);
        evaluate(runtime);
      },
      track(track) {
        if (!live()) return;
        putDeck({ deck: "_", track, playing: true });
        evaluate(runtime);
      },
      status(state, detail = null) {
        if (!live()) return;
        setStatus(runtime, state, detail);
      },
    };
  };

  const requireRuntime = (id: string): Runtime => {
    const runtime = runtimes.get(id);
    if (!runtime) throw new Error(`Unknown adapter: ${id}`);
    return runtime;
  };

  const teardown = async (runtime: Runtime) => {
    runtime.enabled = false;
    runtime.generation += 1;
    runtime.pendingTimer?.cancel();
    runtime.pendingTimer = null;
    runtime.pendingKey = null;
    runtime.decks.clear();
    runtime.committed = null;
    try {
      await runtime.adapter.stop();
    } catch (error) {
      reportError(runtime.adapter.id, error);
    }
    setStatus(runtime, "stopped", null);
    recomputeGlobal();
  };

  return {
    register(adapter) {
      if (runtimes.has(adapter.id)) throw new Error(`Adapter already registered: ${adapter.id}`);
      runtimes.set(adapter.id, {
        adapter,
        enabled: false,
        generation: 0,
        decks: new Map(),
        committed: null,
        committedAt: 0,
        pendingKey: null,
        pendingTimer: null,
        status: { state: "stopped", detail: null, since: clock.now() },
      });
    },
    async unregister(id) {
      const runtime = runtimes.get(id);
      if (!runtime) return;
      if (runtime.enabled) await teardown(runtime);
      runtimes.delete(id);
    },
    async enable(id) {
      const runtime = requireRuntime(id);
      if (runtime.enabled) return;
      runtime.enabled = true;
      runtime.generation += 1;
      const generation = runtime.generation;
      setStatus(runtime, "starting", null);
      try {
        await runtime.adapter.start(createSink(runtime, generation));
      } catch (error) {
        reportError(id, error);
        if (runtime.generation === generation) {
          setStatus(runtime, "error", error instanceof Error ? error.message : String(error));
        }
      }
    },
    async disable(id) {
      const runtime = requireRuntime(id);
      if (!runtime.enabled) return;
      await teardown(runtime);
    },
    isEnabled: (id) => requireRuntime(id).enabled,
    list() {
      return [...runtimes.values()].map((runtime) => ({
        id: runtime.adapter.id,
        label: runtime.adapter.label,
        source: runtime.adapter.source,
        enabled: runtime.enabled,
        status: runtime.status,
        current: runtime.committed,
      }));
    },
    current: () => lastEvent,
    on: (event, listener) => emitter.on(event, listener),
    async dispose() {
      for (const runtime of [...runtimes.values()]) {
        if (runtime.enabled) await teardown(runtime);
      }
      runtimes.clear();
      emitter.clear();
    },
  };
}
