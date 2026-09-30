import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
  type JWTPayload,
} from "jose";
import { eq } from "drizzle-orm";
import { memberships, users } from "../src/db/schema";
import { createGoogleVerifier } from "../src/modules/auth/google";
import { errorCode } from "./helpers/api";
import { createTestContext, uniq, type TestContext } from "./helpers/context";
import { apiOf, registerOwner } from "./helpers/factories";

const clientId = "joymusic-test-client.apps.googleusercontent.com";

describe("google sign-in", () => {
  let signingKey: CryptoKey;
  let verifier: ReturnType<typeof createGoogleVerifier>;
  let context: TestContext;
  let unconfigured: TestContext;

  async function idToken(
    claims: JWTPayload,
    options: { issuer?: string; audience?: string; expiresIn?: string; key?: CryptoKey } = {},
  ) {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(options.issuer ?? "https://accounts.google.com")
      .setAudience(options.audience ?? clientId)
      .setIssuedAt()
      .setExpirationTime(options.expiresIn ?? "10m")
      .sign(options.key ?? signingKey);
  }

  beforeAll(async () => {
    const pair = await generateKeyPair("RS256");
    signingKey = pair.privateKey;
    const publicJwk: JWK = { ...(await exportJWK(pair.publicKey)), kid: "test-key", alg: "RS256" };
    verifier = createGoogleVerifier({ clientId, keys: createLocalJWKSet({ keys: [publicJwk] }) });
    context = await createTestContext({
      deps: { google: verifier },
      env: { GOOGLE_CLIENT_ID: clientId },
    });
    unconfigured = await createTestContext();
  });
  afterAll(async () => {
    await context.close();
    await unconfigured.close();
  });

  const api = () => apiOf(context);

  it("answers forbidden when Google sign-in is not configured", async () => {
    const response = await apiOf(unconfigured).call("authGoogle", {
      body: { idToken: "anything" },
    });
    expect(response.status).toBe(403);
    expect(errorCode(response)).toBe("forbidden");
    expect((response.body as { error: { message: string } }).error.message).toBe(
      "Google sign-in is not configured",
    );
  });

  describe("id token verification", () => {
    const profile = {
      sub: "sub-1",
      email: "Person@Example.com",
      email_verified: true,
      name: "Person",
    };

    it("accepts a valid token and normalizes the profile", async () => {
      const result = await verifier.verify(
        await idToken({ ...profile, picture: "https://x.test/a.png" }),
      );
      expect(result).toEqual({
        sub: "sub-1",
        email: "person@example.com",
        name: "Person",
        picture: "https://x.test/a.png",
      });
      const alternateIssuer = await verifier.verify(
        await idToken(profile, { issuer: "accounts.google.com" }),
      );
      expect(alternateIssuer.sub).toBe("sub-1");
    });

    it("rejects wrong audience, wrong issuer, expired and foreign-signed tokens", async () => {
      const other = await generateKeyPair("RS256");
      const rejected = [
        await idToken(profile, { audience: "someone-else" }),
        await idToken(profile, { issuer: "https://evil.example.com" }),
        await new SignJWT(profile)
          .setProtectedHeader({ alg: "RS256", kid: "test-key" })
          .setIssuer("https://accounts.google.com")
          .setAudience(clientId)
          .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
          .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
          .sign(signingKey),
        await idToken(profile, { key: other.privateKey }),
        "not-a-jwt",
      ];
      for (const token of rejected) {
        await expect(verifier.verify(token)).rejects.toMatchObject({ status: 401 });
      }
    });

    it("rejects tokens using a different algorithm than RS256", async () => {
      const hmac = await new SignJWT(profile)
        .setProtectedHeader({ alg: "HS256", kid: "test-key" })
        .setIssuer("https://accounts.google.com")
        .setAudience(clientId)
        .setExpirationTime("10m")
        .sign(new TextEncoder().encode("x".repeat(40)));
      await expect(verifier.verify(hmac)).rejects.toMatchObject({ status: 401 });
    });

    it("rejects unverified emails and tokens without an email", async () => {
      await expect(
        verifier.verify(await idToken({ ...profile, email_verified: false })),
      ).rejects.toMatchObject({ status: 403 });
      await expect(verifier.verify(await idToken({ sub: "sub-2" }))).rejects.toMatchObject({
        status: 401,
      });
    });
  });

  describe("endpoint", () => {
    it("creates an account with its own organization and recognizes it afterwards", async () => {
      const email = `${uniq("g")}@example.com`;
      const token = await idToken({
        sub: uniq("sub"),
        email,
        email_verified: true,
        name: "Gina Google",
      });
      const first = await api().ok("authGoogle", { body: { idToken: token } });
      expect(first.me.user.email).toBe(email);
      expect(first.me.memberships).toEqual([
        expect.objectContaining({ role: "owner", organizationName: "Gina Google workspace" }),
      ]);
      const second = await api().ok("authGoogle", { body: { idToken: token } });
      expect(second.me.user.id).toBe(first.me.user.id);
      expect(second.me.memberships).toHaveLength(1);
      const [row] = await context.deps.db
        .select()
        .from(users)
        .where(eq(users.id, first.me.user.id));
      expect(row?.passwordHash).toBeNull();
    });

    it("does not link a Google identity to an existing password account", async () => {
      const owner = await registerOwner(context);
      const token = await idToken({
        sub: uniq("sub"),
        email: owner.email,
        email_verified: true,
        name: "Impostor",
      });
      const response = await api().call("authGoogle", { body: { idToken: token } });
      expect(response.status).toBe(409);
      expect(errorCode(response)).toBe("conflict");
    });

    it("joins the inviting organization instead of creating a new one", async () => {
      const owner = await registerOwner(context);
      const email = `${uniq("invitee")}@example.com`;
      await api().ok("adminMemberInvite", {
        token: owner.accessToken,
        body: { email, role: "admin" },
      });
      const token = await idToken({
        sub: uniq("sub"),
        email,
        email_verified: true,
        name: "Invitee",
      });
      const result = await api().ok("authGoogle", { body: { idToken: token } });
      expect(result.me.memberships).toEqual([
        expect.objectContaining({ organizationId: owner.organizationId, role: "admin" }),
      ]);
      const rows = await context.deps.db
        .select()
        .from(memberships)
        .where(eq(memberships.userId, result.me.user.id));
      expect(rows).toHaveLength(1);
    });

    it("rejects invalid tokens with 401", async () => {
      const response = await api().call("authGoogle", { body: { idToken: "garbage" } });
      expect(response.status).toBe(401);
    });
  });
});
