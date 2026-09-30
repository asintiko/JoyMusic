import { useEffect, useState, useSyncExternalStore } from "react";
import { defaultSettings } from "../../common/settings";
import { emptyOutboxState } from "../../common/commands";
import { signedOutAuthState, topicNames } from "../../common/bridge";
import type { RealtimeTarget, RealtimeUpdate, TopicMap, TopicName } from "../../common/bridge";
import { getBridge } from "../bridge/access";

export const topicDefaults: TopicMap = {
  auth: signedOutAuthState,
  net: { online: true, latencyMs: null, checkedAt: null },
  outbox: emptyOutboxState,
  adapters: { adapters: [], detected: null },
  settings: defaultSettings,
  session: null,
  stage: { open: false, displayId: null, displays: [] },
  stageConfig: null,
  updates: { status: "disabled", version: null, progress: null, message: null, checkedAt: null },
};

interface Cell<K extends TopicName> {
  value: TopicMap[K];
  loaded: boolean;
  listeners: Set<() => void>;
  started: boolean;
  subscribe: (listener: () => void) => () => void;
}

const cells = new Map<TopicName, Cell<TopicName>>();

function cellFor<K extends TopicName>(name: K): Cell<K> {
  let cell = cells.get(name) as Cell<K> | undefined;
  if (!cell) {
    const listeners = new Set<() => void>();
    cell = {
      value: topicDefaults[name],
      loaded: false,
      listeners,
      started: false,
      subscribe: (listener) => {
        listeners.add(listener);
        return () => {
          listeners.delete(listener);
        };
      },
    };
    cells.set(name, cell as unknown as Cell<TopicName>);
  }
  return cell;
}

function notify(cell: Cell<TopicName>) {
  for (const listener of [...cell.listeners]) listener();
}

function start<K extends TopicName>(name: K) {
  const cell = cellFor(name);
  if (cell.started) return;
  cell.started = true;
  const bridge = getBridge();
  bridge.topics.subscribe(name, (value) => {
    cell.value = value;
    cell.loaded = true;
    notify(cell as unknown as Cell<TopicName>);
  });
  void bridge.topics.get(name).then((value) => {
    if (cell.loaded) return;
    cell.value = value;
    cell.loaded = true;
    notify(cell as unknown as Cell<TopicName>);
  });
}

export async function preloadTopics(): Promise<void> {
  const bridge = getBridge();
  await Promise.all(
    topicNames.map(async (name) => {
      start(name);
      const cell = cellFor(name);
      if (cell.loaded) return;
      const value = await bridge.topics.get(name);
      if (cell.loaded) return;
      cell.value = value;
      cell.loaded = true;
      notify(cell as unknown as Cell<TopicName>);
    }),
  );
}

export function resetTopicCache(): void {
  cells.clear();
}

export function useTopic<K extends TopicName>(name: K): TopicMap[K] {
  start(name);
  const cell = cellFor(name);
  return useSyncExternalStore(
    cell.subscribe,
    () => cell.value,
    () => cell.value,
  );
}

export function useTopicLoaded(name: TopicName): boolean {
  start(name);
  const cell = cellFor(name);
  return useSyncExternalStore(
    cell.subscribe,
    () => cell.loaded,
    () => cell.loaded,
  );
}

export function useRealtime(target: RealtimeTarget | null): RealtimeUpdate | null {
  const [update, setUpdate] = useState<RealtimeUpdate | null>(null);
  const venue = target?.venue ?? null;
  const role = target?.role ?? null;
  useEffect(() => {
    setUpdate(null);
    if (venue === null || role === null) return undefined;
    return getBridge().realtime.subscribe({ venue, role }, setUpdate);
  }, [venue, role]);
  return update;
}

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(handle);
  }, [intervalMs]);
  return now;
}
