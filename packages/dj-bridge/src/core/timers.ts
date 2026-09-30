import type { AdapterState, AdapterStatus, Clock, NowPlayingSink, Timers } from "./types";

export const systemClock: Clock = { now: () => Date.now() };

export const systemTimers: Timers = {
  after(ms, task) {
    const handle = setTimeout(task, ms);
    return { cancel: () => clearTimeout(handle) };
  },
  every(ms, task) {
    const handle = setInterval(task, ms);
    return { cancel: () => clearInterval(handle) };
  },
};

export interface StatusHolder {
  get(): AdapterStatus;
  set(state: AdapterState, detail?: string | null): void;
  bind(sink: NowPlayingSink | null): void;
}

export function createStatusHolder(clock: Clock = systemClock): StatusHolder {
  let current: AdapterStatus = { state: "stopped", detail: null, since: clock.now() };
  let bound: NowPlayingSink | null = null;
  return {
    get: () => current,
    set(state, detail = null) {
      current = { state, detail, since: clock.now() };
      bound?.status(state, detail);
    },
    bind(sink) {
      bound = sink;
    },
  };
}
