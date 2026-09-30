import type { Track } from "@joymusic/shared";

export type SearchStatus = "idle" | "loading" | "ready" | "error";

export interface SearchState {
  status: SearchStatus;
  query: string;
  tracks: Track[];
}

export interface SearchControllerOptions {
  run: (query: string, signal: AbortSignal) => Promise<Track[]>;
  onChange: (state: SearchState) => void;
  debounceMs?: number;
  minLength?: number;
  cacheSize?: number;
  cacheTtlMs?: number;
  now?: () => number;
}

export interface SearchController {
  search(input: string): void;
  retry(): void;
  cancel(): void;
  destroy(): void;
}

export function normalizeQuery(input: string): string {
  return input.trim().replace(/\s+/g, " ");
}

export function createSearchController(options: SearchControllerOptions): SearchController {
  const debounceMs = options.debounceMs ?? 260;
  const minLength = options.minLength ?? 2;
  const cacheSize = options.cacheSize ?? 30;
  const cacheTtl = options.cacheTtlMs ?? 60_000;
  const now = options.now ?? Date.now;
  const cache = new Map<string, { at: number; tracks: Track[] }>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let controller: AbortController | null = null;
  let latest = "";
  let destroyed = false;
  let visible: Track[] = [];

  function emit(state: SearchState) {
    if (!destroyed) options.onChange(state);
  }

  function clearPending() {
    if (timer) clearTimeout(timer);
    timer = null;
    controller?.abort();
    controller = null;
  }

  async function execute(query: string) {
    const key = query.toLocaleLowerCase();
    const cached = cache.get(key);
    if (cached && now() - cached.at < cacheTtl) {
      visible = cached.tracks;
      emit({ status: "ready", query, tracks: cached.tracks });
      return;
    }
    const current = new AbortController();
    controller = current;
    try {
      const tracks = await options.run(query, current.signal);
      if (current.signal.aborted || destroyed) return;
      cache.set(key, { at: now(), tracks });
      if (cache.size > cacheSize) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
      }
      visible = tracks;
      emit({ status: "ready", query, tracks });
    } catch {
      if (current.signal.aborted || destroyed) return;
      visible = [];
      emit({ status: "error", query, tracks: [] });
    }
  }

  function schedule(query: string, immediate: boolean) {
    clearPending();
    emit({ status: "loading", query, tracks: visible });
    if (immediate) {
      void execute(query);
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      void execute(query);
    }, debounceMs);
  }

  return {
    search(input) {
      const query = normalizeQuery(input);
      latest = query;
      if (query.length < minLength) {
        clearPending();
        visible = [];
        emit({ status: "idle", query, tracks: [] });
        return;
      }
      schedule(query, false);
    },
    retry() {
      if (latest.length >= minLength) schedule(latest, true);
    },
    cancel() {
      clearPending();
      latest = "";
      visible = [];
      emit({ status: "idle", query: "", tracks: [] });
    },
    destroy() {
      destroyed = true;
      clearPending();
    },
  };
}
