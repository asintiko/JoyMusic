export type Listener<T> = (payload: T) => void;

export interface Emitter<Events extends Record<string, unknown>> {
  on<K extends keyof Events>(event: K, listener: Listener<Events[K]>): () => void;
  emit<K extends keyof Events>(event: K, payload: Events[K]): void;
  clear(): void;
}

export function createEmitter<Events extends Record<string, unknown>>(
  onListenerError: (error: unknown) => void = () => undefined,
): Emitter<Events> {
  const listeners = new Map<keyof Events, Set<Listener<never>>>();
  return {
    on(event, listener) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      set.add(listener as Listener<never>);
      return () => {
        set.delete(listener as Listener<never>);
      };
    },
    emit(event, payload) {
      const set = listeners.get(event);
      if (!set) return;
      for (const listener of [...set]) {
        try {
          (listener as Listener<typeof payload>)(payload);
        } catch (error) {
          onListenerError(error);
        }
      }
    },
    clear() {
      listeners.clear();
    },
  };
}
