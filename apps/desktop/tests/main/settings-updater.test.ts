import { describe, expect, it } from "vitest";
import {
  applySettingsPatch,
  defaultSettings,
  parseStoredSettings,
  settingsPatchSchema,
} from "../../src/common/settings";
import { createSettingsService } from "../../src/core/settings-service";
import { validateRouteInput } from "../../src/main/route-input";
import { createUpdaterService } from "../../src/main/updater";
import type { UpdaterLike } from "../../src/main/updater";
import { createMemoryFiles } from "./support/memory-stores";

describe("settings", () => {
  it("merges nested patches without losing siblings", () => {
    const next = applySettingsPatch(defaultSettings, {
      adapters: { traktor: { enabled: true, port: 9000 } },
      stage: { theme: "lounge" },
    });
    expect(next.adapters.traktor).toEqual({ enabled: true, port: 9000, password: null });
    expect(next.adapters.serato.enabled).toBe(false);
    expect(next.stage).toEqual({ displayId: null, theme: "lounge", autoOpen: false });
  });

  it("rejects invalid values", () => {
    expect(() =>
      applySettingsPatch(defaultSettings, { adapters: { traktor: { port: 80 } } }),
    ).toThrow();
    expect(settingsPatchSchema.safeParse({ locale: "de" }).success).toBe(false);
  });

  it("falls back to defaults for missing or broken files and keeps valid fields", () => {
    expect(parseStoredSettings(null)).toEqual(defaultSettings);
    expect(parseStoredSettings("{oops")).toEqual(defaultSettings);
    const salvaged = parseStoredSettings(
      JSON.stringify({ locale: "ru", boothMode: true, stage: "nope" }),
    );
    expect(salvaged.locale).toBe("uz");
    const partial = parseStoredSettings(JSON.stringify({ locale: "ru", boothMode: true }));
    expect(partial.locale).toBe("ru");
    expect(partial.boothMode).toBe(true);
    expect(partial.adapters).toEqual(defaultSettings.adapters);
  });

  it("persists updates and reloads them", async () => {
    const files = createMemoryFiles();
    const service = createSettingsService(files);
    await service.init();
    await service.update({ locale: "en", largeTargets: true });
    await service.flush();
    const reloaded = createSettingsService(files);
    await reloaded.init();
    expect(reloaded.get().locale).toBe("en");
    expect(reloaded.get().largeTargets).toBe(true);
  });
});

describe("route input validation", () => {
  it("accepts well formed input and rejects a malformed one", () => {
    expect(validateRouteInput("djRequestAccept", { params: { id: "req_1" } })).toEqual({
      params: { id: "req_1" },
    });
    expect(() => validateRouteInput("djRequestAccept", { params: { id: "" } })).toThrow();
    expect(() => validateRouteInput("catalogSearch", { query: { q: "" } })).toThrow();
    expect(validateRouteInput("catalogSearch", { query: { q: "sevaman" } })).toEqual({
      query: { q: "sevaman", limit: 20 },
    });
  });
});

class FakeUpdater implements UpdaterLike {
  autoDownload = false;
  autoInstallOnAppQuit = false;
  listeners = new Map<string, (...args: never[]) => void>();
  checks = 0;
  installed = false;
  on(event: string, listener: (...args: never[]) => void) {
    this.listeners.set(event, listener);
  }
  async checkForUpdates() {
    this.checks += 1;
  }
  quitAndInstall() {
    this.installed = true;
  }
  emit(event: string, payload?: unknown) {
    (this.listeners.get(event) as (value?: unknown) => void)(payload);
  }
}

describe("updater", () => {
  it("is disabled outside packaged builds", async () => {
    const updater = new FakeUpdater();
    const service = createUpdaterService({
      updater,
      enabled: false,
      now: () => 1,
      autoCheck: true,
    });
    expect(service.topic.get().status).toBe("disabled");
    await service.check();
    expect(updater.checks).toBe(0);
  });

  it("walks through check, download and ready", async () => {
    const updater = new FakeUpdater();
    const service = createUpdaterService({
      updater,
      enabled: true,
      now: () => 42,
      autoCheck: true,
    });
    expect(updater.autoDownload).toBe(true);
    await service.check();
    expect(updater.checks).toBe(1);
    updater.emit("checking-for-update");
    expect(service.topic.get().status).toBe("checking");
    updater.emit("update-available", { version: "1.2.0" });
    expect(service.topic.get()).toMatchObject({ status: "downloading", version: "1.2.0" });
    updater.emit("download-progress", { percent: 50 });
    expect(service.topic.get().progress).toBe(0.5);
    service.install();
    expect(updater.installed).toBe(false);
    updater.emit("update-downloaded", { version: "1.2.0" });
    expect(service.topic.get().status).toBe("ready");
    service.install();
    expect(updater.installed).toBe(true);
  });

  it("reports errors and up-to-date states", () => {
    const updater = new FakeUpdater();
    const service = createUpdaterService({
      updater,
      enabled: true,
      now: () => 42,
      autoCheck: true,
    });
    updater.emit("update-not-available");
    expect(service.topic.get()).toMatchObject({ status: "notAvailable", checkedAt: 42 });
    updater.emit("error", new Error("offline"));
    expect(service.topic.get()).toMatchObject({ status: "error", message: "offline" });
  });

  it("schedules automatic checks only when enabled by the user", () => {
    const updater = new FakeUpdater();
    const scheduled: { task: () => void; ms: number }[] = [];
    const service = createUpdaterService({
      updater,
      enabled: true,
      now: () => 1,
      autoCheck: false,
      startDelayMs: 100,
      setTimer: (task, ms) => {
        scheduled.push({ task, ms });
        return { cancel: () => undefined };
      },
    });
    service.start();
    expect(scheduled[0]?.ms).toBe(100);
    scheduled[0]?.task();
    expect(updater.checks).toBe(0);
  });
});
