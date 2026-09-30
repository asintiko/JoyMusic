import { jwtVerify, SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import { unauthorized } from "../../errors";

export const accessTokenTtlSeconds = 15 * 60;
export const refreshTokenTtlSeconds = 30 * 24 * 60 * 60;
export const guestTokenTtlSeconds = 12 * 60 * 60;

const issuer = "joymusic-api";
const userAudience = "joymusic-user";
const guestAudience = "joymusic-guest";

export interface AccessTokenClaims {
  userId: string;
}

export interface GuestTokenClaims {
  deviceId: string;
  venueId: string;
}

export interface TokenService {
  signAccessToken(userId: string): Promise<{ token: string; expiresIn: number }>;
  verifyAccessToken(token: string): Promise<AccessTokenClaims>;
  signGuestToken(claims: GuestTokenClaims): Promise<string>;
  verifyGuestToken(token: string): Promise<GuestTokenClaims>;
}

export function createTokenService(secret: string): TokenService {
  const key = new TextEncoder().encode(secret);

  async function sign(
    subject: string,
    audience: string,
    ttlSeconds: number,
    claims: Record<string, unknown> = {},
  ): Promise<string> {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(subject)
      .setIssuer(issuer)
      .setAudience(audience)
      .setJti(randomUUID())
      .setIssuedAt()
      .setExpirationTime(`${ttlSeconds}s`)
      .sign(key);
  }

  async function verify(token: string, audience: string) {
    try {
      const { payload } = await jwtVerify(token, key, {
        issuer,
        audience,
        algorithms: ["HS256"],
      });
      return payload;
    } catch {
      throw unauthorized("Invalid or expired token");
    }
  }

  return {
    async signAccessToken(userId) {
      return {
        token: await sign(userId, userAudience, accessTokenTtlSeconds),
        expiresIn: accessTokenTtlSeconds,
      };
    },
    async verifyAccessToken(token) {
      const payload = await verify(token, userAudience);
      if (!payload.sub) throw unauthorized("Invalid or expired token");
      return { userId: payload.sub };
    },
    signGuestToken({ deviceId, venueId }) {
      return sign(deviceId, guestAudience, guestTokenTtlSeconds, { venueId });
    },
    async verifyGuestToken(token) {
      const payload = await verify(token, guestAudience);
      const venueId = payload.venueId;
      if (!payload.sub || typeof venueId !== "string") throw unauthorized("Invalid or expired token");
      return { deviceId: payload.sub, venueId };
    },
  };
}
