import type { JobTask } from "./tasks";

export interface JobScheduler {
  start(): void;
  stop(): void;
  runOnce(): Promise<void>;
}

export interface SchedulerOptions {
  intervalMs: number;
  now?: () => Date;
  onError?: (name: string, error: unknown) => void;
}

export function createJobScheduler(
  tasks: readonly JobTask[],
  options: SchedulerOptions,
): JobScheduler {
  const now = options.now ?? (() => new Date());
  let timer: ReturnType<typeof setInterval> | null = null;
  let running: Promise<void> | null = null;

  async function pass(): Promise<void> {
    for (const task of tasks) {
      try {
        await task.run(now());
      } catch (error) {
        options.onError?.(task.name, error);
      }
    }
  }

  function runOnce(): Promise<void> {
    if (running) return running;
    running = pass().finally(() => {
      running = null;
    });
    return running;
  }

  return {
    runOnce,
    start() {
      if (timer) return;
      timer = setInterval(() => void runOnce(), options.intervalMs);
      timer.unref();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  };
}
