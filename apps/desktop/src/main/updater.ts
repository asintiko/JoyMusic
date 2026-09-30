import type { UpdateState } from "../common/bridge";
import { createTopic } from "../core/topic";

export interface UpdaterLike {
  autoDownload: boolean;
  autoInstallOnAppQuit: boolean;
  on(event: string, listener: (...args: never[]) => void): unknown;
  checkForUpdates(): Promise<unknown>;
  quitAndInstall(): void;
}

export interface UpdaterOptions {
  updater: UpdaterLike | null;
  enabled: boolean;
  now(): number;
  autoCheck: boolean;
  intervalMs?: number;
  startDelayMs?: number;
  setTimer?: (task: () => void, ms: number) => { cancel(): void };
}

const idleState: UpdateState = {
  status: "idle",
  version: null,
  progress: null,
  message: null,
  checkedAt: null,
};

export function createUpdaterService(options: UpdaterOptions) {
  const topic = createTopic<UpdateState>(
    options.enabled && options.updater ? idleState : { ...idleState, status: "disabled" },
  );
  const setTimer =
    options.setTimer ??
    ((task: () => void, ms: number) => {
      const handle = setTimeout(task, ms);
      handle.unref?.();
      return { cancel: () => clearTimeout(handle) };
    });
  let scheduled: { cancel(): void } | null = null;
  const updater = options.enabled ? options.updater : null;

  const patch = (change: Partial<UpdateState>) =>
    topic.update((current) => ({ ...current, ...change }));

  if (updater) {
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = true;
    updater.on("checking-for-update", () => patch({ status: "checking", message: null }));
    updater.on("update-available", ((info: { version?: string }) =>
      patch({ status: "downloading", version: info.version ?? null, progress: 0 })) as never);
    updater.on("update-not-available", () =>
      patch({ status: "notAvailable", checkedAt: options.now(), progress: null }),
    );
    updater.on("download-progress", ((progress: { percent?: number }) =>
      patch({ status: "downloading", progress: (progress.percent ?? 0) / 100 })) as never);
    updater.on("update-downloaded", ((info: { version?: string }) =>
      patch({ status: "ready", version: info.version ?? null, progress: 1 })) as never);
    updater.on("error", ((error: Error) =>
      patch({ status: "error", message: error.message, checkedAt: options.now() })) as never);
  }

  const check = async () => {
    if (!updater) return;
    try {
      await updater.checkForUpdates();
    } catch (error) {
      patch({
        status: "error",
        message: error instanceof Error ? error.message : "Update check failed",
        checkedAt: options.now(),
      });
    }
  };

  const loop = (delay: number) => {
    scheduled = setTimer(() => {
      if (options.autoCheck) void check();
      loop(options.intervalMs ?? 6 * 60 * 60_000);
    }, delay);
  };

  return {
    topic,
    check,
    install() {
      if (updater && topic.get().status === "ready") updater.quitAndInstall();
    },
    start() {
      if (!updater) return;
      loop(options.startDelayMs ?? 15_000);
    },
    stop() {
      scheduled?.cancel();
      scheduled = null;
    },
  };
}

export type UpdaterService = ReturnType<typeof createUpdaterService>;
