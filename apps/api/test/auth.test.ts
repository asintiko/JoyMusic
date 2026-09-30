import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { decodeJwt, SignJWT } from "jose";
import { eq } from "drizzle-orm";
import { invites, memberships, refreshTokens, users } from "../src/db/schema";
import { sha256Hex } from "../src/lib/ids";
import { createPasswordHasher } from "../src/modules/auth/password";
import { errorCode } from "./helpers/api";
import { createTestContext, uniq, type TestContext } from "./helpers/context";
import { addMember, apiOf, registerOwner, testPassword } from "./helpers/factories";

describe("auth", () => {
  let context: TestContext;
  const passwords = createPasswordHasher("fast");
  const verifySpy = vi.spyOn(passwords, "verify");
  const equalizerSpy = vi.spyOn(passwords, "spendVerificationTime");

  beforeAll(async () => {
    context = await createTestContext({ deps: { passwords } });
  });
  afterAll(async () => {
    await context.close();
  });

  const api = () => apiOf(context);

  describe("register", () => {
    it("creates the organization, owner membership and working tokens", async () => {
      const email = `Mixed.Case.${uniq()}@Example.com`;
      const result = await api().ok("authRegister", {
        body: {
          email,
          password: testPassword,
          name: "New Owner",
          organizationName: "Fresh Org",
          locale: "ru",
        },
      });
      expect(result.me.user.email).toBe(email.toLowerCase());
      expect(result.me.user.locale).toBe("ru");
      expect(result.me.memberships).toEqual([
        expect.objectContaining({ organizationName: "Fresh Org", role: "owner" }),
      ]);
      expect(result.me.isPlatformAdmin).toBe(false);
      expect(result.expiresIn).toBe(900);
      const claims = decodeJwt(result.accessToken);
      expect(claims.sub).toBe(result.me.user.id);
      expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(900);
      const me = await api().ok("me", { token: result.accessToken });
      expect(me.user.id).toBe(result.me.user.id);
    });

    it("stores an argon2id hash and never the password", async () => {
      const owner = await registerOwner(context);
      const [row] = await context.deps.db.select().from(users).where(eq(users.id, owner.userId));
      expect(row?.passwordHash).toMatch(/^\$argon2id\$/);
      expect(row?.passwordHash).not.toContain(testPassword);
    });

    it("rejects a duplicate email regardless of case", async () => {
      const owner = await registerOwner(context);
      const response = await api().call("authRegister", {
        body: {
          email: owner.email.toUpperCase(),
          password: testPassword,
          name: "Other",
          organizationName: "Other Org",
        },
      });
      expect(response.status).toBe(409);
      expect(errorCode(response)).toBe("email_taken");
    });

    it("validates the body and reports field paths", async () => {
      const response = await api().call("authRegister", {
        body: {
          email: "not-an-email",
          password: "short",
          name: "",
          organizationName: "x",
        },
      });
      expect(response.status).toBe(400);
      expect(errorCode(response)).toBe("validation_failed");
      const details = (response.body as { error: { details: { path: string[] }[] } }).error.details;
      expect(details.map((issue) => issue.path[0]).sort()).toEqual([
        "email",
        "name",
        "organizationName",
        "password",
      ]);
    });
  });

  describe("login", () => {
    it("signs in with a case-insensitive email", async () => {
      const owner = await registerOwner(context);
      const result = await api().ok("authLogin", {
        body: { email: owner.email.toUpperCase(), password: owner.password },
      });
      expect(result.me.user.id).toBe(owner.userId);
      expect(result.refreshToken).not.toBe(owner.refreshToken);
    });

    it("returns the same generic error for a wrong password and an unknown email", async () => {
      const owner = await registerOwner(context);
      const wrongPassword = await api().call("authLogin", {
        body: { email: owner.email, password: "definitely-wrong" },
      });
      const unknownEmail = await api().call("authLogin", {
        body: { email: `${uniq("ghost")}@example.com`, password: "definitely-wrong" },
      });
      expect(wrongPassword.status).toBe(401);
      expect(unknownEmail.status).toBe(401);
      expect(errorCode(wrongPassword)).toBe("invalid_credentials");
      expect(wrongPassword.body).toEqual(unknownEmail.body);
    });

    it("spends verification time when the account does not exist", async () => {
      equalizerSpy.mockClear();
      verifySpy.mockClear();
      await api().call("authLogin", {
        body: { email: `${uniq("ghost")}@example.com`, password: "whatever-password" },
      });
      expect(equalizerSpy).toHaveBeenCalledTimes(1);
      expect(verifySpy).not.toHaveBeenCalled();
    });

    it("does not let password-less accounts sign in with a password", async () => {
      const email = `${uniq("nopass")}@example.com`;
      await context.deps.db
        .insert(users)
        .values({ id: `usr_${uniq()}`, email, name: "No Password", googleSub: uniq("sub") });
      const response = await api().call("authLogin", {
        body: { email, password: "anything-at-all" },
      });
      expect(errorCode(response)).toBe("invalid_credentials");
    });
  });

  describe("refresh tokens", () => {
    it("rotates on every use and links the chain within one family", async () => {
      const owner = await registerOwner(context);
      const rotated = await api().ok("authRefresh", { body: { refreshToken: owner.refreshToken } });
      expect(rotated.refreshToken).not.toBe(owner.refreshToken);
      const rows = await context.deps.db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, owner.userId));
      const first = rows.find((row) => row.tokenHash === sha256Hex(owner.refreshToken));
      const second = rows.find((row) => row.tokenHash === sha256Hex(rotated.refreshToken));
      expect(first?.revokedAt).not.toBeNull();
      expect(first?.replacedBy).toBe(second?.id);
      expect(second?.revokedAt).toBeNull();
      expect(second?.familyId).toBe(first?.familyId);
      const me = await api().ok("me", { token: rotated.accessToken });
      expect(me.user.id).toBe(owner.userId);
    });

    it("stores only a sha256 digest of the token", async () => {
      const owner = await registerOwner(context);
      const rows = await context.deps.db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, owner.userId));
      expect(rows.map((row) => row.tokenHash)).toEqual([sha256Hex(owner.refreshToken)]);
      expect(rows[0]?.expiresAt.getTime()).toBeGreaterThan(Date.now() + 29 * 24 * 3600 * 1000);
    });

    it("revokes the whole family when a rotated token is replayed", async () => {
      const owner = await registerOwner(context);
      const second = await api().ok("authRefresh", { body: { refreshToken: owner.refreshToken } });
      const third = await api().ok("authRefresh", { body: { refreshToken: second.refreshToken } });
      const replay = await api().call("authRefresh", {
        body: { refreshToken: owner.refreshToken },
      });
      expect(replay.status).toBe(401);
      expect(errorCode(replay)).toBe("unauthorized");
      const afterReplay = await api().call("authRefresh", {
        body: { refreshToken: third.refreshToken },
      });
      expect(afterReplay.status).toBe(401);
      const rows = await context.deps.db
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.userId, owner.userId));
      expect(rows).toHaveLength(3);
      expect(rows.every((row) => row.revokedAt !== null)).toBe(true);
    });

    it("keeps other sessions of the same user alive when one family is revoked", async () => {
      const owner = await registerOwner(context);
      const otherDevice = await api().ok("authLogin", {
        body: { email: owner.email, password: owner.password },
      });
      await api().ok("authRefresh", { body: { refreshToken: owner.refreshToken } });
      await api().call("authRefresh", { body: { refreshToken: owner.refreshToken } });
      const stillWorks = await api().call("authRefresh", {
        body: { refreshToken: otherDevice.refreshToken },
      });
      expect(stillWorks.status).toBe(200);
    });

    it("rejects concurrent use of one token: only one caller wins", async () => {
      const owner = await registerOwner(context);
      const results = await Promise.all([
        api().call("authRefresh", { body: { refreshToken: owner.refreshToken } }),
        api().call("authRefresh", { body: { refreshToken: owner.refreshToken } }),
      ]);
      expect(results.map((result) => result.status).sort()).toEqual([200, 401]);
    });

    it("rejects unknown and expired tokens", async () => {
      const unknown = await api().call("authRefresh", { body: { refreshToken: "nope" } });
      expect(unknown.status).toBe(401);
      const owner = await registerOwner(context);
      await context.deps.db
        .update(refreshTokens)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(refreshTokens.userId, owner.userId));
      const expired = await api().call("authRefresh", {
        body: { refreshToken: owner.refreshToken },
      });
      expect(expired.status).toBe(401);
    });

    it("logout revokes the family and is idempotent", async () => {
      const owner = await registerOwner(context);
      const rotated = await api().ok("authRefresh", { body: { refreshToken: owner.refreshToken } });
      const first = await api().ok("authLogout", { body: { refreshToken: rotated.refreshToken } });
      const second = await api().ok("authLogout", { body: { refreshToken: rotated.refreshToken } });
      const unknown = await api().ok("authLogout", { body: { refreshToken: "never-issued" } });
      expect([first.ok, second.ok, unknown.ok]).toEqual([true, true, true]);
      const attempt = await api().call("authRefresh", {
        body: { refreshToken: rotated.refreshToken },
      });
      expect(attempt.status).toBe(401);
    });
  });

  describe("access tokens", () => {
    it("requires a bearer token", async () => {
      const missing = await api().call("me");
      expect(missing.status).toBe(401);
      expect(errorCode(missing)).toBe("unauthorized");
      const basic = await api().call("me", { headers: { authorization: "Basic abc" } });
      expect(basic.status).toBe(401);
    });

    it("rejects tampered, foreign-secret, expired and wrong-audience tokens", async () => {
      const owner = await registerOwner(context);
      const tampered = `${owner.accessToken.slice(0, -3)}abc`;
      const key = new TextEncoder().encode("another-secret-another-secret-123456");
      const foreign = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(owner.userId)
        .setIssuer("joymusic-api")
        .setAudience("joymusic-user")
        .setExpirationTime("10m")
        .sign(key);
      const ownKey = new TextEncoder().encode(context.config.jwtSecret);
      const expired = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(owner.userId)
        .setIssuer("joymusic-api")
        .setAudience("joymusic-user")
        .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
        .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
        .sign(ownKey);
      const wrongAudience = await new SignJWT({})
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(owner.userId)
        .setIssuer("joymusic-api")
        .setAudience("someone-else")
        .setExpirationTime("10m")
        .sign(ownKey);
      for (const token of [tampered, foreign, expired, wrongAudience]) {
        const response = await api().call("me", { token });
        expect(response.status).toBe(401);
      }
    });

    it("rejects tokens of deleted accounts", async () => {
      const owner = await registerOwner(context);
      await context.deps.db.delete(users).where(eq(users.id, owner.userId));
      const response = await api().call("me", { token: owner.accessToken });
      expect(response.status).toBe(401);
    });

    it("keeps guest and user tokens apart", async () => {
      const owner = await registerOwner(context);
      const guestToken = await context.deps.tokens.signGuestToken({
        deviceId: "device-123456",
        venueId: "ven_x",
      });
      const asUser = await api().call("me", { token: guestToken });
      expect(asUser.status).toBe(401);
      await expect(context.deps.tokens.verifyGuestToken(owner.accessToken)).rejects.toMatchObject({
        status: 401,
      });
      const verified = await context.deps.tokens.verifyGuestToken(guestToken);
      expect(verified).toEqual({ deviceId: "device-123456", venueId: "ven_x" });
      const claims = decodeJwt(guestToken);
      expect((claims.exp ?? 0) - (claims.iat ?? 0)).toBe(12 * 3600);
    });
  });

  describe("invites", () => {
    it("creates a new account, joins with the invited role and burns the token", async () => {
      const owner = await registerOwner(context);
      const invited = await api().ok("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: `New.Dj.${uniq()}@Example.com`, role: "dj" },
      });
      const accepted = await api().ok("authInviteAccept", {
        body: { token: invited.inviteToken, name: "New DJ", password: testPassword },
      });
      expect(accepted.me.memberships).toEqual([
        expect.objectContaining({ organizationId: owner.organizationId, role: "dj" }),
      ]);
      expect(accepted.me.user.email).toBe(invited.member.email);
      const again = await api().call("authInviteAccept", {
        body: { token: invited.inviteToken, name: "New DJ", password: testPassword },
      });
      expect(again.status).toBe(400);
      expect(errorCode(again)).toBe("invite_invalid");
    });

    it("rejects unknown and expired invites", async () => {
      const unknown = await api().call("authInviteAccept", {
        body: { token: "nonsense", name: "X", password: testPassword },
      });
      expect(errorCode(unknown)).toBe("invite_invalid");
      const owner = await registerOwner(context);
      const invited = await api().ok("adminMemberInvite", {
        token: owner.accessToken,
        body: { email: `${uniq("late")}@example.com`, role: "admin" },
      });
      await context.deps.db
        .update(invites)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(invites.id, invited.member.id));
      const expired = await api().call("authInviteAccept", {
        body: { token: invited.inviteToken, name: "Late", password: testPassword },
      });
      expect(errorCode(expired)).toBe("invite_invalid");
    });

    it("attaches an existing account after verifying its password", async () => {
      const firstOwner = await registerOwner(context);
      const secondOwner = await registerOwner(context);
      const invited = await api().ok("adminMemberInvite", {
        token: firstOwner.accessToken,
        body: { email: secondOwner.email, role: "admin" },
      });
      const wrong = await api().call("authInviteAccept", {
        body: { token: invited.inviteToken, name: "Second", password: "not-the-password" },
      });
      expect(wrong.status).toBe(401);
      expect(errorCode(wrong)).toBe("invalid_credentials");
      const accepted = await api().ok("authInviteAccept", {
        body: { token: invited.inviteToken, name: "Second", password: secondOwner.password },
      });
      expect(accepted.me.user.id).toBe(secondOwner.userId);
      expect(accepted.me.memberships.map((entry) => entry.role).sort()).toEqual(["admin", "owner"]);
      const rows = await context.deps.db
        .select()
        .from(memberships)
        .where(eq(memberships.userId, secondOwner.userId));
      expect(rows).toHaveLength(2);
    });

    it("refuses to hand a password-less account over to an invite holder", async () => {
      const owner = await registerOwner(context);
      const email = `${uniq("google")}@example.com`;
      await context.deps.db
        .insert(users)
        .values({ id: `usr_${uniq()}`, email, name: "Google Only", googleSub: uniq("sub") });
      const invited = await api().ok("adminMemberInvite", {
        token: owner.accessToken,
        body: { email, role: "dj" },
      });
      const response = await api().call("authInviteAccept", {
        body: { token: invited.inviteToken, name: "Attacker", password: "attacker-password" },
      });
      expect(response.status).toBe(409);
      expect(errorCode(response)).toBe("conflict");
    });

    it("lets a member accepted through an invite use member-level access", async () => {
      const owner = await registerOwner(context);
      const admin = await addMember(context, owner, "admin");
      const venues = await api().ok("adminVenues", { token: admin.accessToken });
      expect(venues.venues).toEqual([]);
    });
  });
});
