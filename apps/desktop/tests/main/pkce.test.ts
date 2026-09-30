import { describe, expect, it } from "vitest";
import {
  buildAuthorizeUrl,
  createCodeChallenge,
  createCodeVerifier,
  createState,
  statesMatch,
} from "../../src/core/pkce";

describe("PKCE helpers", () => {
  it("matches the RFC 7636 appendix B vector", async () => {
    const challenge = await createCodeChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk");
    expect(challenge).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });

  it("creates verifiers in the allowed alphabet and length range", () => {
    for (const length of [43, 64, 128]) {
      const verifier = createCodeVerifier(length);
      expect(verifier).toHaveLength(length);
      expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/u);
    }
    expect(() => createCodeVerifier(42)).toThrow(RangeError);
    expect(() => createCodeVerifier(129)).toThrow(RangeError);
  });

  it("never repeats a verifier or a state", () => {
    const verifiers = new Set(Array.from({ length: 50 }, () => createCodeVerifier()));
    const states = new Set(Array.from({ length: 50 }, () => createState()));
    expect(verifiers.size).toBe(50);
    expect(states.size).toBe(50);
  });

  it("produces a challenge the API accepts", async () => {
    const challenge = await createCodeChallenge(createCodeVerifier());
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(createState()).toMatch(/^[A-Za-z0-9_-]{32}$/u);
  });

  it("builds the admin authorize url", () => {
    const url = new URL(buildAuthorizeUrl("http://localhost:5173/", "state12345678", "challenge"));
    expect(url.origin).toBe("http://localhost:5173");
    expect(url.pathname).toBe("/desktop/authorize");
    expect(url.searchParams.get("state")).toBe("state12345678");
    expect(url.searchParams.get("challenge")).toBe("challenge");
  });

  it("compares states without length leaks", () => {
    expect(statesMatch("abcdefgh", "abcdefgh")).toBe(true);
    expect(statesMatch("abcdefgh", "abcdefgi")).toBe(false);
    expect(statesMatch("abcdefgh", "abc")).toBe(false);
  });
});
