import { createHash, randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { desktopAuthCodes } from "../src/db/schema";
import { sha256Hex } from "../src/lib/ids";
import { errorCode } from "./helpers/api";
import { createTestContext, type TestContext } from "./helpers/context";
import { apiOf, registerOwner } from "./helpers/factories";

function pkcePair() {
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

describe("desktop PKCE flow", () => {
  let context: TestContext;
  beforeAll(async () => {
    context = await createTestContext();
  });
  afterAll(async () => {
    await context.close();
  });
  const api = () => apiOf(context);
  const state = "state-value-1234";

  it("issues a full session for the user who authorized the code", async () => {
    const owner = await registerOwner(context);
    const { codeVerifier, codeChallenge } = pkcePair();
    const authorized = await api().ok("authDesktopAuthorize", {
      token: owner.accessToken,
      body: { codeChallenge, state },
    });
    expect(authorized.state).toBe(state);
    const result = await api().ok("authDesktopToken", {
      body: { code: authorized.code, codeVerifier },
    });
    expect(result.me.user.id).toBe(owner.userId);
    const me = await api().ok("me", { token: result.accessToken });
    expect(me.user.id).toBe(owner.userId);
    const refreshed = await api().ok("authRefresh", { body: { refreshToken: result.refreshToken } });
    expect(refreshed.refreshToken).not.toBe(result.refreshToken);
  });

  it("stores only a hash of the code and expires it after 60 seconds", async () => {
    const owner = await registerOwner(context);
    const { codeChallenge } = pkcePair();
    const authorized = await api().ok("authDesktopAuthorize", {
      token: owner.accessToken,
      body: { codeChallenge, state },
    });
    const [row] = await context.deps.db
      .select()
      .from(desktopAuthCodes)
      .where(eq(desktopAuthCodes.codeHash, sha256Hex(authorized.code)));
    expect(row).toBeDefined();
    expect(row?.codeChallenge).toBe(codeChallenge);
    const lifetimeMs = (row?.expiresAt.getTime() ?? 0) - (row?.createdAt.getTime() ?? 0);
    expect(lifetimeMs).toBeGreaterThan(55_000);
    expect(lifetimeMs).toBeLessThanOrEqual(60_500);
    const rawRows = await context.deps.db
      .select()
      .from(desktopAuthCodes)
      .where(eq(desktopAuthCodes.codeHash, authorized.code));
    expect(rawRows).toHaveLength(0);
  });

  it("requires a signed-in user to authorize", async () => {
    const { codeChallenge } = pkcePair();
    const response = await api().call("authDesktopAuthorize", { body: { codeChallenge, state } });
    expect(response.status).toBe(401);
  });

  it("rejects malformed challenges", async () => {
    const owner = await registerOwner(context);
    const response = await api().call("authDesktopAuthorize", {
      token: owner.accessToken,
      body: { codeChallenge: "!".repeat(43), state },
    });
    expect(response.status).toBe(400);
    expect(errorCode(response)).toBe("validation_failed");
  });

  it("rejects a wrong verifier and burns the code", async () => {
    const owner = await registerOwner(context);
    const { codeVerifier, codeChallenge } = pkcePair();
    const authorized = await api().ok("authDesktopAuthorize", {
      token: owner.accessToken,
      body: { codeChallenge, state },
    });
    const tampered = pkcePair().codeVerifier;
    const wrong = await api().call("authDesktopToken", {
      body: { code: authorized.code, codeVerifier: tampered },
    });
    expect(wrong.status).toBe(401);
    const correctAfterwards = await api().call("authDesktopToken", {
      body: { code: authorized.code, codeVerifier },
    });
    expect(correctAfterwards.status).toBe(401);
  });

  it("rejects a tampered code and a challenge that was not derived with S256", async () => {
    const owner = await registerOwner(context);
    const { codeVerifier, codeChallenge } = pkcePair();
    const authorized = await api().ok("authDesktopAuthorize", {
      token: owner.accessToken,
      body: { codeChallenge, state },
    });
    const tamperedCode = `${authorized.code.slice(0, -2)}xx`;
    const tamperedResponse = await api().call("authDesktopToken", {
      body: { code: tamperedCode, codeVerifier },
    });
    expect(tamperedResponse.status).toBe(401);

    const plainVerifier = randomBytes(48).toString("base64url");
    const plainChallenge = await api().ok("authDesktopAuthorize", {
      token: owner.accessToken,
      body: { codeChallenge: plainVerifier, state },
    });
    const plain = await api().call("authDesktopToken", {
      body: { code: plainChallenge.code, codeVerifier: plainVerifier },
    });
    expect(plain.status).toBe(401);
  });

  it("is single use", async () => {
    const owner = await registerOwner(context);
    const { codeVerifier, codeChallenge } = pkcePair();
    const authorized = await api().ok("authDesktopAuthorize", {
      token: owner.accessToken,
      body: { codeChallenge, state },
    });
    const first = await api().call("authDesktopToken", {
      body: { code: authorized.code, codeVerifier },
    });
    const second = await api().call("authDesktopToken", {
      body: { code: authorized.code, codeVerifier },
    });
    expect(first.status).toBe(200);
    expect(second.status).toBe(401);
  });

  it("allows only one winner when the same code is redeemed concurrently", async () => {
    const owner = await registerOwner(context);
    const { codeVerifier, codeChallenge } = pkcePair();
    const authorized = await api().ok("authDesktopAuthorize", {
      token: owner.accessToken,
      body: { codeChallenge, state },
    });
    const results = await Promise.all(
      [1, 2, 3].map(() =>
        api().call("authDesktopToken", { body: { code: authorized.code, codeVerifier } }),
      ),
    );
    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
  });

  it("rejects expired codes", async () => {
    const owner = await registerOwner(context);
    const { codeVerifier, codeChallenge } = pkcePair();
    const authorized = await api().ok("authDesktopAuthorize", {
      token: owner.accessToken,
      body: { codeChallenge, state },
    });
    await context.deps.db
      .update(desktopAuthCodes)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(desktopAuthCodes.codeHash, sha256Hex(authorized.code)));
    const response = await api().call("authDesktopToken", {
      body: { code: authorized.code, codeVerifier },
    });
    expect(response.status).toBe(401);
  });

  it("rejects verifiers with illegal characters before touching the code", async () => {
    const owner = await registerOwner(context);
    const { codeVerifier, codeChallenge } = pkcePair();
    const authorized = await api().ok("authDesktopAuthorize", {
      token: owner.accessToken,
      body: { codeChallenge, state },
    });
    const response = await api().call("authDesktopToken", {
      body: { code: authorized.code, codeVerifier: `${"a".repeat(42)}!` },
    });
    expect(response.status).toBe(400);
    const valid = await api().call("authDesktopToken", {
      body: { code: authorized.code, codeVerifier },
    });
    expect(valid.status).toBe(200);
  });
});
