import { useSyncExternalStore } from "react";

export interface ExternalValue<T> {
  get(): T;
  set(next: T): void;
  subscribe(listener: () => void): () => void;
}

export function createExternalValue<T>(initial: T): ExternalValue<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function useExternalValue<T>(store: ExternalValue<T>): T {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
