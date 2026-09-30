import { describe, expect, it } from "vitest";
import type { NowPlayingEvent } from "@joymusic/dj-bridge";
import { defaultSettings } from "../../src/common/settings";
import type { AdapterSettings } from "../../src/common/settings";
import { createAdapterHost } from "../../src/core/adapter-host";
import { createNodeAdapterFactory } from "../../src/main/adapter-factories";
import { createManualTime } from "./support/manual-time";

function adapterSettings(patch: Partial<Record<keyof AdapterSettings, object>>): AdapterSettings {
  const next = { ...defaultSettings.adapters } as Record<string, object>;
  for (const [key, value] of Object.entries(patch)) {
    next[key] = { ...(next[key] as object), ...value };
  }
  return next as unknown as AdapterSettings;
}

function setup(loader?: (specifier: string) => Promise<unknown>) {
  const time = createManualTime();
  const factory = createNodeAdapterFactory({
    platform: "darwin",
    homeDir: "/Users/dj",
    env: {},
    loader,
  });
  const host = createAdapterHost({
    factory,
    clock: time,
    timers: time,
    debounceMs: 1000,
    clearAfterMs: 2000,
  });
  const events: NowPlayingEvent[] = [];
  host.onNowPlaying((event) => events.push(event));
  return { time, host, events };
}

describe("adapter host", () => {
  it("registers every adapter but only runs the enabled ones", async () => {
    const { host } = setup();
    await host.reconcile(adapterSettings({ simulator: { enabled: true } }));
    const entries = host.topic.get().adapters;
    expect(entries.map((entry) => entry.id).sort()).toEqual(
      ["prolink", "serato", "simulator", "stagelinq", "textfile", "traktor", "virtualdj"].sort(),
    );
    expect(entries.filter((entry) => entry.enabled).map((entry) => entry.id)).toEqual([
      "simulator",
    ]);
    expect(entries.find((entry) => entry.id === "simulator")?.status.state).toBe("active");
    await host.dispose();
  });

  it("reports detected tracks from the simulator after the debounce", async () => {
    const { host, events, time } = setup();
    await host.reconcile(adapterSettings({ simulator: { enabled: true } }));
    expect(events).toHaveLength(0);
    await time.advance(1000);
    expect(events).toHaveLength(1);
    expect(events[0]?.track).toMatchObject({ title: "Sevaman", artist: "Shahzoda", bpm: 96 });
    expect(host.topic.get().detected?.track?.title).toBe("Sevaman");
    host.advanceSimulator();
    await time.advance(1000);
    expect(events.at(-1)?.track?.title).toBe("Blinding Lights");
    await host.dispose();
  });

  it("stops reporting when an adapter is switched off", async () => {
    const { host, events, time } = setup();
    await host.reconcile(adapterSettings({ simulator: { enabled: true } }));
    await time.advance(1000);
    await host.reconcile(adapterSettings({ simulator: { enabled: false } }));
    expect(events.at(-1)?.reason).toBe("cleared");
    expect(host.topic.get().adapters.find((entry) => entry.id === "simulator")?.status.state).toBe(
      "stopped",
    );
    await host.dispose();
  });

  it("degrades Pro DJ Link and StageLinQ to unavailable when the modules are missing", async () => {
    const { host } = setup(async (specifier) => {
      throw new Error(`Cannot find package '${specifier}'`);
    });
    await host.reconcile(
      adapterSettings({ prolink: { enabled: true }, stagelinq: { enabled: true } }),
    );
    const byId = new Map(host.topic.get().adapters.map((entry) => [entry.id, entry]));
    expect(byId.get("prolink")?.status.state).toBe("unavailable");
    expect(byId.get("stagelinq")?.status.state).toBe("unavailable");
    await host.dispose();
  });

  it("recreates an adapter when its configuration changes", async () => {
    const { host } = setup();
    await host.reconcile(adapterSettings({ textfile: { enabled: true, path: "/tmp/a.txt" } }));
    const first = host.topic.get().adapters.find((entry) => entry.id === "textfile");
    expect(first?.status.state).toBe("waiting");
    expect(first?.status.detail).toContain("/tmp/a.txt");
    await host.reconcile(adapterSettings({ textfile: { enabled: true, path: "/tmp/b.txt" } }));
    const second = host.topic.get().adapters.find((entry) => entry.id === "textfile");
    expect(second?.status.detail).toContain("/tmp/b.txt");
    await host.dispose();
  });

  it("listens for Traktor on the configured port and reports it", async () => {
    const { host } = setup();
    await host.reconcile(adapterSettings({ traktor: { enabled: true, port: 18765 } }));
    const entry = host.topic.get().adapters.find((item) => item.id === "traktor");
    expect(entry?.status.state).toBe("waiting");
    expect(entry?.status.detail).toContain("18765");
    await host.dispose();
  });
});
