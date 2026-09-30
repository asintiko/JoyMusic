export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function createMemoryStore(): KeyValueStore {
  const values = new Map<string, string>();
  return {
    get: (key) => values.get(key) ?? null,
    set: (key, value) => void values.set(key, value),
    remove: (key) => void values.delete(key),
  };
}

export function createStorage(backend: Storage | null | undefined): KeyValueStore {
  const memory = createMemoryStore();
  let broken = !backend;
  return {
    get(key) {
      if (broken || !backend) return memory.get(key);
      try {
        return backend.getItem(key);
      } catch {
        broken = true;
        return memory.get(key);
      }
    },
    set(key, value) {
      memory.set(key, value);
      if (broken || !backend) return;
      try {
        backend.setItem(key, value);
      } catch {
        broken = true;
      }
    },
    remove(key) {
      memory.remove(key);
      if (broken || !backend) return;
      try {
        backend.removeItem(key);
      } catch {
        broken = true;
      }
    },
  };
}

function readLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

let shared: KeyValueStore | null = null;

export function browserStorage(): KeyValueStore {
  if (shared) return shared;
  shared = createStorage(readLocalStorage());
  return shared;
}

export function readJson<T>(store: KeyValueStore, key: string, fallback: T): T {
  const raw = store.get(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(store: KeyValueStore, key: string, value: unknown): void {
  store.set(key, JSON.stringify(value));
}
