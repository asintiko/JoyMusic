import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";
import { AppError, forbidden, unauthorized } from "../../errors";

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
  picture: string | null;
}

export interface GoogleVerifier {
  verify(idToken: string): Promise<GoogleProfile>;
}

export const googleJwksUrl = "https://www.googleapis.com/oauth2/v3/certs";
export const googleIssuers = ["https://accounts.google.com", "accounts.google.com"];

export interface GoogleVerifierOptions {
  clientId: string | undefined;
  keys?: JWTVerifyGetKey;
}

export function createGoogleVerifier(options: GoogleVerifierOptions): GoogleVerifier {
  const { clientId } = options;
  let keys = options.keys;
  return {
    async verify(idToken) {
      if (!clientId) throw forbidden("Google sign-in is not configured");
      keys ??= createRemoteJWKSet(new URL(googleJwksUrl), { timeoutDuration: 5000 });
      let payload;
      try {
        ({ payload } = await jwtVerify(idToken, keys, {
          issuer: googleIssuers,
          audience: clientId,
          algorithms: ["RS256"],
        }));
      } catch {
        throw unauthorized("Invalid Google ID token");
      }
      const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
      if (!payload.sub || !email) throw unauthorized("Invalid Google ID token");
      if (payload.email_verified !== true && payload.email_verified !== "true") {
        throw new AppError("forbidden", 403, "Google account email is not verified");
      }
      const name = typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : email;
      return {
        sub: payload.sub,
        email,
        name: name.slice(0, 80),
        picture: typeof payload.picture === "string" ? payload.picture : null,
      };
    },
  };
}
