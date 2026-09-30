import { timingSafeEqual } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import type { AuthResult, AuthTokens, Me } from "@joymusic/shared";
import type { Executor } from "../../db/client";
import {
  desktopAuthCodes,
  invites,
  memberships,
  organizations,
  refreshTokens,
  users,
} from "../../db/schema";
import type { Deps } from "../../deps";
import {
  AppError,
  badRequest,
  conflict,
  isUniqueViolation,
  rateLimited,
  unauthorized,
} from "../../errors";
import type { AuthUser } from "../../http/context";
import { newId, randomSecret, sha256Base64Url, sha256Hex } from "../../lib/ids";
import { recordAudit } from "../audit/service";
import { loadAuthUser } from "./guards";
import { refreshTokenTtlSeconds } from "./tokens";

export interface RequestMeta {
  userAgent: string | null;
  ip: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  organizationName: string;
  locale?: "uz" | "ru" | "en" | undefined;
}

const desktopCodeTtlMs = 60_000;
const codeChallengePattern = /^[A-Za-z0-9_-]{43,128}$/;
const codeVerifierPattern = /^[A-Za-z0-9._~-]{43,128}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toMe(user: AuthUser): Me {
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
    },
    memberships: user.memberships.map((membership) => ({
      organizationId: membership.organizationId,
      organizationName: membership.organizationName,
      role: membership.role,
    })),
    isPlatformAdmin: user.isPlatformAdmin,
  };
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function truncateUserAgent(userAgent: string | null): string | null {
  return userAgent ? userAgent.slice(0, 256) : null;
}

export function createAuthService(deps: Deps) {
  const { db, tokens, passwords, counters, config } = deps;

  async function issueTokens(
    executor: Executor,
    userId: string,
    meta: RequestMeta,
    family?: { familyId: string; tokenId: string },
  ): Promise<AuthTokens> {
    const access = await tokens.signAccessToken(userId);
    const refreshToken = randomSecret(32);
    await executor.insert(refreshTokens).values({
      id: family?.tokenId ?? newId("rt"),
      userId,
      tokenHash: sha256Hex(refreshToken),
      familyId: family?.familyId ?? newId("fam"),
      expiresAt: new Date(Date.now() + refreshTokenTtlSeconds * 1000),
      userAgent: truncateUserAgent(meta.userAgent),
    });
    return { accessToken: access.token, refreshToken, expiresIn: access.expiresIn };
  }

  async function authResult(userId: string, meta: RequestMeta): Promise<AuthResult> {
    const user = await loadAuthUser(db, userId);
    if (!user) throw unauthorized("Account no longer exists");
    const issued = await issueTokens(db, userId, meta);
    return { ...issued, me: toMe(user) };
  }

  function loginThrottleKey(email: string, ip: string): string {
    return `login:${email}:${ip}`;
  }

  async function register(input: RegisterInput, meta: RequestMeta): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    const passwordHash = await passwords.hash(input.password);
    const userId = newId("usr");
    const organizationId = newId("org");
    try {
      await db.transaction(async (tx) => {
        await tx.insert(organizations).values({ id: organizationId, name: input.organizationName });
        await tx.insert(users).values({
          id: userId,
          email,
          name: input.name,
          passwordHash,
          locale: input.locale ?? "uz",
        });
        await tx.insert(memberships).values({
          id: newId("mem"),
          organizationId,
          userId,
          role: "owner",
        });
        await recordAudit(tx, {
          organizationId,
          actorUserId: userId,
          action: "organization.create",
          target: organizationId,
          meta: { name: input.organizationName },
        });
      });
    } catch (error) {
      if (isUniqueViolation(error, "users_email_unique")) {
        throw new AppError("email_taken", 409, "An account with this email already exists");
      }
      throw error;
    }
    return authResult(userId, meta);
  }

  async function login(
    input: { email: string; password: string },
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    const throttleKey = loginThrottleKey(email, meta.ip);
    const state = await counters.read(throttleKey);
    if (state.count >= config.login.maxFailures) {
      throw rateLimited(
        "Too many failed sign-in attempts. Try again later.",
        Math.max(1, Math.ceil(state.retryAfterMs / 1000)),
      );
    }
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    let verified = false;
    if (user?.passwordHash) {
      verified = await passwords.verify(user.passwordHash, input.password);
    } else {
      await passwords.spendVerificationTime(input.password);
    }
    if (!user || !verified) {
      await counters.increment(throttleKey, config.login.lockoutSeconds * 1000);
      throw new AppError("invalid_credentials", 401, "Invalid email or password");
    }
    await counters.reset(throttleKey);
    return authResult(user.id, meta);
  }

  async function refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokens> {
    const tokenHash = sha256Hex(refreshToken);
    const outcome = await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .for("update")
        .limit(1);
      if (!row) return { kind: "invalid" } as const;
      const now = new Date();
      if (row.revokedAt) {
        await tx
          .update(refreshTokens)
          .set({ revokedAt: now })
          .where(and(eq(refreshTokens.familyId, row.familyId), isNull(refreshTokens.revokedAt)));
        return { kind: "reuse" } as const;
      }
      if (row.expiresAt.getTime() <= now.getTime()) return { kind: "invalid" } as const;
      const nextTokenId = newId("rt");
      await tx
        .update(refreshTokens)
        .set({ revokedAt: now, replacedBy: nextTokenId })
        .where(eq(refreshTokens.id, row.id));
      const issued = await issueTokens(tx, row.userId, meta, {
        familyId: row.familyId,
        tokenId: nextTokenId,
      });
      return { kind: "ok", tokens: issued } as const;
    });
    if (outcome.kind === "ok") return outcome.tokens;
    throw unauthorized(
      outcome.kind === "reuse"
        ? "Refresh token was already used; the session has been revoked"
        : "Invalid or expired refresh token",
    );
  }

  async function logout(refreshToken: string): Promise<void> {
    const [row] = await db
      .select({ familyId: refreshTokens.familyId })
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, sha256Hex(refreshToken)))
      .limit(1);
    if (!row) return;
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, row.familyId), isNull(refreshTokens.revokedAt)));
  }

  async function acceptInvite(
    input: { token: string; name: string; password: string },
    meta: RequestMeta,
  ): Promise<AuthResult> {
    const tokenHash = sha256Hex(input.token);
    const now = new Date();
    const passwordHash = await passwords.hash(input.password);
    const userId = await db.transaction(async (tx) => {
      const [invite] = await tx
        .update(invites)
        .set({ acceptedAt: now })
        .where(
          and(
            eq(invites.tokenHash, tokenHash),
            isNull(invites.acceptedAt),
            gt(invites.expiresAt, now),
          ),
        )
        .returning();
      if (!invite) throw new AppError("invite_invalid", 400, "Invite is invalid or has expired");
      const [existing] = await tx.select().from(users).where(eq(users.email, invite.email)).limit(1);
      let memberId: string;
      if (existing) {
        if (!existing.passwordHash) {
          throw conflict("An account with this email already exists. Sign in with Google to join.");
        }
        const matches = await passwords.verify(existing.passwordHash, input.password);
        if (!matches) {
          throw new AppError("invalid_credentials", 401, "Password does not match the existing account");
        }
        memberId = existing.id;
      } else {
        memberId = newId("usr");
        await tx.insert(users).values({
          id: memberId,
          email: invite.email,
          name: input.name,
          passwordHash,
        });
      }
      await tx
        .insert(memberships)
        .values({
          id: newId("mem"),
          organizationId: invite.organizationId,
          userId: memberId,
          role: invite.role,
        })
        .onConflictDoNothing({ target: [memberships.organizationId, memberships.userId] });
      await recordAudit(tx, {
        organizationId: invite.organizationId,
        actorUserId: memberId,
        action: "member.join",
        target: memberId,
        meta: { role: invite.role, inviteId: invite.id },
      });
      return memberId;
    });
    return authResult(userId, meta);
  }

  async function google(idToken: string, meta: RequestMeta): Promise<AuthResult> {
    const profile = await deps.google.verify(idToken);
    const userId = await db.transaction(async (tx) => {
      let [user] = await tx.select().from(users).where(eq(users.googleSub, profile.sub)).limit(1);
      let created = false;
      if (!user) {
        const [sameEmail] = await tx
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, profile.email))
          .limit(1);
        if (sameEmail) {
          throw conflict(
            "An account with this email already exists. Sign in with your password instead.",
          );
        }
        [user] = await tx
          .insert(users)
          .values({
            id: newId("usr"),
            email: profile.email,
            name: profile.name,
            googleSub: profile.sub,
            avatarUrl: profile.picture,
          })
          .returning();
        created = true;
      }
      if (!user) throw new AppError("internal", 500, "Could not create the account");
      const pending = await tx
        .select()
        .from(invites)
        .where(
          and(
            eq(invites.email, profile.email),
            isNull(invites.acceptedAt),
            gt(invites.expiresAt, new Date()),
          ),
        );
      for (const invite of pending) {
        await tx
          .insert(memberships)
          .values({
            id: newId("mem"),
            organizationId: invite.organizationId,
            userId: user.id,
            role: invite.role,
          })
          .onConflictDoNothing({ target: [memberships.organizationId, memberships.userId] });
        await tx.update(invites).set({ acceptedAt: new Date() }).where(eq(invites.id, invite.id));
        await recordAudit(tx, {
          organizationId: invite.organizationId,
          actorUserId: user.id,
          action: "member.join",
          target: user.id,
          meta: { role: invite.role, inviteId: invite.id, via: "google" },
        });
      }
      if (created && pending.length === 0) {
        const organizationId = newId("org");
        await tx
          .insert(organizations)
          .values({ id: organizationId, name: `${profile.name} workspace`.slice(0, 120) });
        await tx.insert(memberships).values({
          id: newId("mem"),
          organizationId,
          userId: user.id,
          role: "owner",
        });
        await recordAudit(tx, {
          organizationId,
          actorUserId: user.id,
          action: "organization.create",
          target: organizationId,
          meta: { via: "google" },
        });
      }
      return user.id;
    });
    return authResult(userId, meta);
  }

  async function desktopAuthorize(
    user: AuthUser,
    input: { codeChallenge: string; state: string },
  ): Promise<{ code: string; state: string }> {
    if (!codeChallengePattern.test(input.codeChallenge)) {
      throw badRequest("codeChallenge must be a base64url encoded SHA-256 digest");
    }
    const code = randomSecret(32);
    await db.insert(desktopAuthCodes).values({
      id: newId("dac"),
      codeHash: sha256Hex(code),
      codeChallenge: input.codeChallenge,
      state: input.state,
      userId: user.id,
      expiresAt: new Date(Date.now() + desktopCodeTtlMs),
    });
    await db
      .delete(desktopAuthCodes)
      .where(lt(desktopAuthCodes.expiresAt, new Date(Date.now() - 60 * 60 * 1000)));
    return { code, state: input.state };
  }

  async function desktopToken(
    input: { code: string; codeVerifier: string },
    meta: RequestMeta,
  ): Promise<AuthResult> {
    if (!codeVerifierPattern.test(input.codeVerifier)) {
      throw badRequest("codeVerifier contains invalid characters");
    }
    const now = new Date();
    const [row] = await db
      .update(desktopAuthCodes)
      .set({ usedAt: now })
      .where(
        and(
          eq(desktopAuthCodes.codeHash, sha256Hex(input.code)),
          isNull(desktopAuthCodes.usedAt),
          gt(desktopAuthCodes.expiresAt, now),
        ),
      )
      .returning();
    const failure = () => unauthorized("Invalid or expired authorization code");
    if (!row) throw failure();
    if (!safeEqual(sha256Base64Url(input.codeVerifier), row.codeChallenge)) throw failure();
    return authResult(row.userId, meta);
  }

  return {
    register,
    login,
    refresh,
    logout,
    acceptInvite,
    google,
    desktopAuthorize,
    desktopToken,
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
