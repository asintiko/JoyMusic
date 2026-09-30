export interface Topic<T> {
  get(): T;
  set(value: T): void;
  update(change: (current: T) => T): void;
  subscribe(listener: (value: T) => void): () => void;
}

export function createTopic<T>(initial: T): Topic<T> {
  let value = initial;
  const listeners = new Set<(value: T) => void>();
  const set = (next: T) => {
    value = next;
    for (const listener of [...listeners]) listener(next);
  };
  return {
    get: () => value,
    set,
    update: (change) => set(change(value)),
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
