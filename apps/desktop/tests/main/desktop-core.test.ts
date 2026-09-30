import { describe, expect, it, vi } from "vitest";
import { createDesktopCore } from "../../src/core/desktop-core";
import type { CoreEnvironment } from "../../src/core/environment";
import { createNodeAdapterFactory } from "../../src/main/adapter-factories";
import { createFakeApi } from "./support/fake-api";
import { createManualTime } from "./support/manual-time";
import { createMemoryFiles, createMemorySecrets } from "./support/memory-stores";

const session = {
  venueId: "ven_1",
  venueSlug: "joy-demo-club",
  venueName: "Joy Demo Club",
  venueTheme: "club" as const,
  sessionId: "ses_1",
};

async function simulatorActive(core: Awaited<ReturnType<typeof boot>>["core"]) {
  await vi.waitFor(() =>
    expect(
      core.topics.adapters.get().adapters.find((entry) => entry.id === "simulator")?.status.state,
    ).toBe("active"),
  );
}

async function boot(files = createMemoryFiles()) {
  const fake = createFakeApi();
  const time = createManualTime();
  const env: CoreEnvironment = {
    config: { apiUrl: "http://api.test", adminUrl: "http://admin.test", webUrl: "http://web.test" },
    fetch: fake.fetch,
    secrets: createMemorySecrets(),
    files,
    openExternal: async () => undefined,
    now: time.now,
    timers: time,
    adapterFactory: createNodeAdapterFactory({ platform: "darwin", homeDir: "/Users/dj", env: {} }),
  };
  const core = createDesktopCore(env, {
    createId: (() => {
      let counter = 0;
      return () => `id-${++counter}`;
    })(),
  });
  await core.start();
  return { core, fake, time, files };
}

describe("desktop core wiring", () => {
  it("sends auto-detected tracks from the simulator to the API for the active session", async () => {
    const { core, fake, time } = await boot();
    await core.auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
    core.activateSession(session);
    await core.settings.update({ adapters: { simulator: { enabled: true } } });
    await simulatorActive(core);
    await time.advance(2_000);
    await core.syncIdle();
    await vi.waitFor(() =>
      expect(fake.callsTo("/v1/dj/sessions/ses_1/nowplaying").length).toBeGreaterThan(0),
    );
    const first = fake.callsTo("/v1/dj/sessions/ses_1/nowplaying")[0];
    expect(first?.method).toBe("PUT");
    expect(first?.body).toMatchObject({ title: "Sevaman", artist: "Shahzoda", bpm: 96, key: "8A" });
    expect(first?.authorization).toMatch(/^Bearer access-/u);
    await core.dispose();
  });

  it("does not talk to the API about tracks before a session is active", async () => {
    const { core, fake, time } = await boot();
    await core.auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
    await core.settings.update({ adapters: { simulator: { enabled: true } } });
    await simulatorActive(core);
    await time.advance(2_000);
    await core.syncIdle();
    expect(fake.calls.filter((call) => call.path.includes("nowplaying"))).toHaveLength(0);
    core.activateSession(session);
    await core.syncIdle();
    await vi.waitFor(() => expect(fake.callsTo("/v1/dj/sessions/ses_1/nowplaying").length).toBe(1));
    await core.dispose();
  });

  it("restores adapter settings on the next launch", async () => {
    const first = await boot();
    await first.core.settings.update({ adapters: { simulator: { enabled: true } } });
    await first.core.settings.flush();
    await first.core.dispose();
    const second = await boot(first.files);
    const simulator = second.core.topics.adapters
      .get()
      .adapters.find((entry) => entry.id === "simulator");
    expect(simulator?.enabled).toBe(true);
    await second.core.dispose();
  });

  it("replays queued commands from a previous run once the connection works", async () => {
    const first = await boot();
    await first.core.auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
    first.fake.offline = true;
    const outcome = await first.core.commands.run({ kind: "accept", requestId: "req_9" });
    expect(outcome.status).toBe("queued");
    await first.core.dispose();

    const files = first.files;
    const second = await boot(files);
    expect(second.core.topics.outbox.get().pending).toBe(1);
    await second.core.auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
    await second.core.commands.retry();
    expect(second.fake.callsTo("/v1/dj/requests/req_9/accept")).toHaveLength(1);
    expect(second.core.topics.outbox.get().pending).toBe(0);
    await second.core.dispose();
  });
});
