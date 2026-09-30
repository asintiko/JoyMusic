import { describe, expect, it } from "vitest";
import { createAuthService } from "../../src/core/auth-service";
import type { CoreEnvironment } from "../../src/core/environment";
import { NetworkFailure } from "../../src/core/errors";
import { createCodeChallenge } from "../../src/core/pkce";
import { createFakeApi } from "./support/fake-api";
import { createManualTime } from "./support/manual-time";
import { createMemoryFiles, createMemorySecrets } from "./support/memory-stores";

function setup(options: { secrets?: ReturnType<typeof createMemorySecrets> } = {}) {
  const fake = createFakeApi();
  const time = createManualTime();
  const opened: string[] = [];
  const secrets = options.secrets ?? createMemorySecrets();
  const env: CoreEnvironment = {
    config: { apiUrl: "http://api.test", adminUrl: "http://admin.test", webUrl: "http://web.test" },
    fetch: fake.fetch,
    secrets,
    files: createMemoryFiles(),
    openExternal: async (url) => {
      opened.push(url);
    },
    now: time.now,
    timers: time,
    adapterFactory: () => null,
  };
  return { fake, time, opened, secrets, env, auth: createAuthService(env) };
}

describe("auth service", () => {
  it("signs in with a password and stores the session in secure storage", async () => {
    const { auth, secrets } = setup();
    const state = await auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
    expect(state.status).toBe("signedIn");
    expect(state.me?.user.name).toBe("DJ Rustam");
    expect(secrets.peek()).toContain("refresh-1");
  });

  it("restores a stored session after a restart without touching the network", async () => {
    const first = setup();
    await first.auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
    const second = setup({ secrets: first.secrets });
    await second.auth.restore();
    expect(second.auth.topic.get().status).toBe("signedIn");
    expect(second.fake.calls).toHaveLength(0);
    expect(await second.auth.getAccessToken()).toBe("access-1");
  });

  it("does not persist a session when secure storage is unavailable", async () => {
    const { auth, secrets } = setup({ secrets: createMemorySecrets(false) });
    await auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
    expect(secrets.peek()).toBeNull();
    expect(auth.topic.get().status).toBe("signedIn");
  });

  it("shares one refresh between concurrent callers and rotates the refresh token", async () => {
    const { auth, fake, time, secrets } = setup();
    await auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
    fake.refreshDelayMs = 15;
    await time.advance(15 * 60_000);
    const tokens = await Promise.all([
      auth.getAccessToken(),
      auth.getAccessToken(),
      auth.getAccessToken(),
    ]);
    expect(new Set(tokens).size).toBe(1);
    expect(fake.callsTo("/v1/auth/refresh")).toHaveLength(1);
    expect(fake.callsTo("/v1/auth/refresh")[0]?.body).toEqual({ refreshToken: "refresh-1" });
    expect(secrets.peek()).toContain("refresh-2");
    expect(secrets.peek()).not.toContain("refresh-1");
  });

  it("signs out when the refresh token was revoked", async () => {
    const { auth, fake, time } = setup();
    await auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
    fake.failWith = (call) =>
      call.path === "/v1/auth/refresh"
        ? new Response(JSON.stringify({ error: { code: "unauthorized", message: "revoked" } }), {
            status: 401,
            headers: { "content-type": "application/json" },
          })
        : null;
    await time.advance(15 * 60_000);
    await expect(auth.getAccessToken()).rejects.toMatchObject({ status: 401 });
    expect(auth.topic.get().status).toBe("signedOut");
    expect(auth.topic.get().error).toBe("session_expired");
  });

  it("stays signed in when the network is down during refresh", async () => {
    const { auth, fake, time } = setup();
    await auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
    fake.offline = true;
    await time.advance(14.8 * 60_000);
    expect(await auth.getAccessToken()).toBe("access-1");
    await time.advance(0.5 * 60_000);
    await expect(auth.getAccessToken()).rejects.toBeInstanceOf(NetworkFailure);
    expect(auth.topic.get().status).toBe("signedIn");
  });

  it("completes the browser flow with PKCE and rejects a forged state", async () => {
    const { auth, opened, fake } = setup();
    const { url } = await auth.beginBrowserLogin();
    expect(opened).toEqual([url]);
    const parsed = new URL(url);
    expect(parsed.origin).toBe("http://admin.test");
    const state = parsed.searchParams.get("state") as string;
    const challenge = parsed.searchParams.get("challenge") as string;
    expect(auth.topic.get().browserLoginPending).toBe(true);

    await auth.handleDeepLink({ kind: "auth", code: "one-time-code", state: "forged-state-1234" });
    expect(auth.topic.get().status).toBe("signedOut");
    expect(auth.topic.get().error).toBe("invalid_state");
    expect(fake.callsTo("/v1/auth/desktop/token")).toHaveLength(0);

    await auth.beginBrowserLogin();
    const second = new URL(opened[1] as string);
    await auth.handleDeepLink({
      kind: "auth",
      code: "one-time-code",
      state: second.searchParams.get("state") as string,
    });
    expect(auth.topic.get().status).toBe("signedIn");
    const exchange = fake.callsTo("/v1/auth/desktop/token")[0]?.body as { codeVerifier: string };
    expect(await createCodeChallenge(exchange.codeVerifier)).toBe(
      second.searchParams.get("challenge"),
    );
    expect(state).not.toBe(second.searchParams.get("state"));
    expect(challenge).not.toBe(second.searchParams.get("challenge"));
  });

  it("expires a pending browser login", async () => {
    const { auth, opened, time } = setup();
    await auth.beginBrowserLogin();
    const state = new URL(opened[0] as string).searchParams.get("state") as string;
    await time.advance(6 * 60_000);
    await auth.handleDeepLink({ kind: "auth", code: "one-time-code", state });
    expect(auth.topic.get().status).toBe("signedOut");
    expect(auth.topic.get().error).toBe("invalid_state");
  });

  it("surfaces a cancelled browser login", async () => {
    const { auth, opened } = setup();
    await auth.beginBrowserLogin();
    const state = new URL(opened[0] as string).searchParams.get("state") as string;
    await auth.handleDeepLink({ kind: "authError", error: "access_denied", state });
    expect(auth.topic.get().error).toBe("access_denied");
    expect(auth.topic.get().browserLoginPending).toBe(false);
  });

  it("clears the session on logout and tells the server", async () => {
    const { auth, fake, secrets } = setup();
    await auth.loginWithPassword("dj@joymusic.uz", "joymusic-demo");
    await auth.logout();
    expect(auth.topic.get().status).toBe("signedOut");
    expect(secrets.peek()).toBeNull();
    expect(fake.callsTo("/v1/auth/logout")[0]?.body).toEqual({ refreshToken: "refresh-1" });
  });
});
