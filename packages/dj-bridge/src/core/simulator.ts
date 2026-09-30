import { createStatusHolder, systemClock, systemTimers } from "./timers";
import type {
  Clock,
  DetectedTrack,
  NowPlayingAdapter,
  NowPlayingSink,
  TimerHandle,
  Timers,
} from "./types";

export interface SimulatorStep {
  track: DetectedTrack | null;
  holdMs: number;
}

export interface SimulatorOptions {
  id?: string;
  label?: string;
  steps?: readonly SimulatorStep[];
  loop?: boolean;
  clock?: Clock;
  timers?: Timers;
}

export const defaultSimulatorSteps: readonly SimulatorStep[] = [
  {
    track: { title: "Sevaman", artist: "Shahzoda", bpm: 96, key: "8A", durationSec: 214 },
    holdMs: 20_000,
  },
  {
    track: {
      title: "Blinding Lights",
      artist: "The Weeknd",
      bpm: 171,
      key: "1A",
      durationSec: 200,
    },
    holdMs: 20_000,
  },
  {
    track: { title: "Ты моя", artist: "Мот", bpm: 124, key: "5A", durationSec: 187 },
    holdMs: 20_000,
  },
  { track: null, holdMs: 5_000 },
];

export interface SimulatorAdapter extends NowPlayingAdapter {
  advance(): void;
}

export function createSimulatorAdapter(options: SimulatorOptions = {}): SimulatorAdapter {
  const steps = options.steps ?? defaultSimulatorSteps;
  const loop = options.loop ?? true;
  const clock = options.clock ?? systemClock;
  const timers = options.timers ?? systemTimers;
  const holder = createStatusHolder(clock);
  let sink: NowPlayingSink | null = null;
  let index = -1;
  let timer: TimerHandle | null = null;

  const schedule = () => {
    timer?.cancel();
    timer = null;
    const step = steps[index];
    if (!step || !sink) return;
    const isLast = index >= steps.length - 1;
    if (isLast && !loop) return;
    timer = timers.after(Math.max(0, step.holdMs), () => advance());
  };

  const advance = () => {
    if (!sink || steps.length === 0) return;
    const next = index + 1 >= steps.length ? (loop ? 0 : index) : index + 1;
    index = next;
    const step = steps[index];
    if (!step) return;
    sink.track(step.track ? { ...step.track, startedAt: clock.now() } : null);
    schedule();
  };

  return {
    id: options.id ?? "simulator",
    label: options.label ?? "Simulator",
    source: "manual",
    async start(next) {
      sink = next;
      holder.bind(next);
      holder.set("active", "scripted");
      index = -1;
      advance();
    },
    async stop() {
      timer?.cancel();
      timer = null;
      sink = null;
      holder.bind(null);
      holder.set("stopped");
    },
    status: () => holder.get(),
    advance,
  };
}
