import type { TimerHandle, Timers } from "@joymusic/dj-bridge";
import type { NetState } from "../common/bridge";
import { createTopic } from "./topic";

export interface ConnectivityOptions {
  timers: Timers;
  now(): number;
  onlineIntervalMs?: number;
  offlineMinMs?: number;
  offlineMaxMs?: number;
}

export function createConnectivity(options: ConnectivityOptions) {
  const onlineInterval = options.onlineIntervalMs ?? 15_000;
  const offlineMin = options.offlineMinMs ?? 2_000;
  const offlineMax = options.offlineMaxMs ?? 10_000;
  const topic = createTopic<NetState>({ online: true, latencyMs: null, checkedAt: null });
  const recovered = new Set<() => void>();
  let probe: (() => Promise<void>) | null = null;
  let timer: TimerHandle | null = null;
  let running = false;
  let offlineDelay = offlineMin;
  let epoch = 0;

  const setOnline = (latencyMs: number | null) => {
    const wasOnline = topic.get().online;
    topic.set({ online: true, latencyMs, checkedAt: options.now() });
    offlineDelay = offlineMin;
    if (!wasOnline) for (const listener of [...recovered]) listener();
  };

  const setOffline = () => {
    epoch += 1;
    topic.set({ online: false, latencyMs: null, checkedAt: options.now() });
  };

  const schedule = () => {
    timer?.cancel();
    timer = null;
    if (!running) return;
    const online = topic.get().online;
    const delay = online ? onlineInterval : offlineDelay;
    timer = options.timers.after(delay, () => {
      void runProbe();
    });
  };

  const runProbe = async () => {
    if (!running || !probe) return;
    const startedAt = options.now();
    const startedEpoch = epoch;
    try {
      await probe();
      if (startedEpoch === epoch) setOnline(Math.max(0, options.now() - startedAt));
    } catch {
      if (topic.get().online) setOffline();
      else offlineDelay = Math.min(offlineMax, offlineDelay * 2);
    }
    schedule();
  };

  return {
    topic,
    setProbe(next: () => Promise<void>) {
      probe = next;
    },
    epoch: () => epoch,
    reportSuccess(sinceEpoch?: number) {
      if (sinceEpoch !== undefined && sinceEpoch !== epoch) return;
      if (!topic.get().online) setOnline(topic.get().latencyMs);
    },
    reportFailure() {
      if (topic.get().online) {
        setOffline();
        schedule();
      }
    },
    onRecovered(listener: () => void) {
      recovered.add(listener);
      return () => {
        recovered.delete(listener);
      };
    },
    probeNow: runProbe,
    start() {
      running = true;
      void runProbe();
    },
    stop() {
      running = false;
      timer?.cancel();
      timer = null;
    },
  };
}

export type Connectivity = ReturnType<typeof createConnectivity>;
