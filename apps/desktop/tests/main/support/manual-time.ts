import type { Clock, TimerHandle, Timers } from "@joymusic/dj-bridge";

export interface ManualTime extends Clock, Timers {
  advance(ms: number): Promise<void>;
  pending(): number;
}

interface Task {
  due: number;
  run: () => void;
  interval: number | null;
  order: number;
}

export function createManualTime(start = 1_700_000_000_000): ManualTime {
  let now = start;
  let sequence = 0;
  const tasks = new Map<number, Task>();

  const add = (ms: number, run: () => void, interval: number | null): TimerHandle => {
    sequence += 1;
    const id = sequence;
    tasks.set(id, { due: now + ms, run, interval, order: id });
    return { cancel: () => void tasks.delete(id) };
  };

  return {
    now: () => now,
    after: (ms, run) => add(ms, run, null),
    every: (ms, run) => add(ms, run, ms),
    pending: () => tasks.size,
    async advance(ms) {
      const target = now + ms;
      for (;;) {
        let next: { id: number; task: Task } | null = null;
        for (const [id, task] of tasks) {
          if (task.due > target) continue;
          if (
            next === null ||
            task.due < next.task.due ||
            (task.due === next.task.due && task.order < next.task.order)
          ) {
            next = { id, task };
          }
        }
        if (next === null) break;
        now = Math.max(now, next.task.due);
        if (next.task.interval !== null) next.task.due = now + next.task.interval;
        else tasks.delete(next.id);
        next.task.run();
        await Promise.resolve();
        await Promise.resolve();
      }
      now = target;
      await Promise.resolve();
    },
  };
}
