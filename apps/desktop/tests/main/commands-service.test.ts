import { describe, expect, it, vi } from "vitest";
import { createApiService } from "../../src/core/api-service";
import { createAuthService } from "../../src/core/auth-service";
import { createCommandsService } from "../../src/core/commands-service";
import { createConnectivity } from "../../src/core/connectivity";
import type { CoreEnvironment } from "../../src/core/environment";
import { createFakeApi } from "./support/fake-api";
import { createManualTime } from "./support/manual-time";
import { createMemoryFiles, createMemorySecrets } from "./support/memory-stores";

async function setup() {
  const fake = createFakeApi();
  const time = createManualTime();
  const env: CoreEnvironment = {
    config: { apiUrl: "http://api.test", adminUrl: "http://admin.test", webUrl: "http://web.test" },
    fetch: fake.fetch,
    secrets: createMemorySecrets(),
    files: createMemoryFiles(),
    openExternal: async () => undefined,
    now: time.now,
    timers: time,
    adapterFactory: () => null,
  };
  const auth = createAuthService(env);
  await auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
  const connectivity = createConnectivity({ timers: time, now: time.now });
  const api = createApiService(env, auth, connectivity);
  connectivity.setProbe(async () => {
    await api.call("health");
  });
  let counter = 0;
  const commands = createCommandsService(env, api, connectivity, () => `id-${++counter}`);
  return { fake, time, connectivity, commands };
}

describe("commands service", () => {
  it("sends commands straight through while online", async () => {
    const { fake, commands } = await setup();
    const outcome = await commands.run({ kind: "accept", requestId: "req_1" });
    expect(outcome).toEqual({ status: "done" });
    expect(fake.callsTo("/v1/dj/requests/req_1/accept")).toHaveLength(1);
    expect(fake.callsTo("/v1/dj/requests/req_1/accept")[0]?.authorization).toMatch(
      /^Bearer access-/u,
    );
  });

  it("queues on a network failure, marks the app offline and replays after recovery", async () => {
    const { fake, time, connectivity, commands } = await setup();
    connectivity.start();
    fake.offline = true;
    const outcome = await commands.run({ kind: "accept", requestId: "req_2" });
    expect(outcome).toEqual({ status: "queued" });
    expect(connectivity.topic.get().online).toBe(false);
    expect(commands.outbox.size()).toBe(1);

    await time.advance(2_000);
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(connectivity.topic.get().online).toBe(false);

    fake.offline = false;
    await time.advance(4_000);
    await vi.waitFor(() => expect(connectivity.topic.get().online).toBe(true));
    await commands.outbox.flush();
    expect(commands.outbox.size()).toBe(0);
    expect(fake.callsTo("/v1/dj/requests/req_2/accept")).toHaveLength(1);
    connectivity.stop();
  });

  it("keeps order: a new command waits behind queued ones", async () => {
    const { fake, connectivity, commands } = await setup();
    fake.offline = true;
    await commands.run({ kind: "accept", requestId: "first" });
    fake.offline = false;
    connectivity.reportSuccess();
    const outcome = await commands.run({ kind: "play", requestId: "first" });
    expect(outcome).toEqual({ status: "done" });
    const paths = fake.calls
      .filter((call) => call.path.startsWith("/v1/dj/"))
      .map((call) => call.path);
    expect(paths.slice(-2)).toEqual(["/v1/dj/requests/first/accept", "/v1/dj/requests/first/play"]);
  });

  it("surfaces real API rejections instead of queueing them", async () => {
    const { fake, commands } = await setup();
    fake.failWith = (call) =>
      call.path.endsWith("/decline")
        ? new Response(
            JSON.stringify({ error: { code: "conflict", message: "Already declined" } }),
            {
              status: 409,
              headers: { "content-type": "application/json" },
            },
          )
        : null;
    await expect(
      commands.run({ kind: "decline", requestId: "r", reason: "no" }),
    ).rejects.toMatchObject({
      code: "conflict",
    });
    expect(commands.outbox.size()).toBe(0);
  });

  it("queues on a server outage", async () => {
    const { fake, commands } = await setup();
    fake.failWith = () =>
      new Response(JSON.stringify({ error: { code: "internal", message: "down" } }), {
        status: 503,
        headers: { "content-type": "application/json" },
      });
    expect(await commands.run({ kind: "played", requestId: "r" })).toEqual({ status: "queued" });
    expect(commands.outbox.size()).toBe(1);
  });
});
