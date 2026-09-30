import { describe, expect, it } from "vitest";
import { findDeepLinkArgument, parseDeepLink } from "../../src/core/deep-link";

describe("deep link parser", () => {
  const state = "abcDEF123456_-xyz";

  it("accepts a well formed auth link", () => {
    expect(parseDeepLink(`joymusic://auth?code=one-time-code&state=${state}`)).toEqual({
      kind: "auth",
      code: "one-time-code",
      state,
    });
  });

  it("accepts a trailing slash and mixed case scheme", () => {
    expect(parseDeepLink(`JoyMusic://auth/?code=one-time-code&state=${state}`)).toEqual({
      kind: "auth",
      code: "one-time-code",
      state,
    });
  });

  it("rejects other schemes, hosts and paths", () => {
    expect(parseDeepLink(`https://auth?code=one-time-code&state=${state}`)).toBeNull();
    expect(parseDeepLink(`joymusic://evil?code=one-time-code&state=${state}`)).toBeNull();
    expect(parseDeepLink(`joymusic://auth/extra?code=one-time-code&state=${state}`)).toBeNull();
    expect(parseDeepLink("not a url")).toBeNull();
  });

  it("rejects missing or malformed parameters", () => {
    expect(parseDeepLink(`joymusic://auth?state=${state}`)).toBeNull();
    expect(parseDeepLink("joymusic://auth?code=one-time-code")).toBeNull();
    expect(parseDeepLink(`joymusic://auth?code=short&state=${state}`)).toBeNull();
    expect(parseDeepLink(`joymusic://auth?code=one-time-code&state=has space here`)).toBeNull();
    expect(parseDeepLink(`joymusic://auth?code=${"a".repeat(600)}&state=${state}`)).toBeNull();
  });

  it("rejects oversized input", () => {
    expect(
      parseDeepLink(`joymusic://auth?code=one-time-code&state=${state}&x=${"y".repeat(3000)}`),
    ).toBeNull();
  });

  it("reports provider errors without leaking arbitrary text", () => {
    expect(parseDeepLink(`joymusic://auth?error=access_denied&state=${state}`)).toEqual({
      kind: "authError",
      error: "access_denied",
      state,
    });
    expect(parseDeepLink("joymusic://auth?error=<script>alert(1)</script>")).toEqual({
      kind: "authError",
      error: "unknown",
      state: null,
    });
  });

  it("finds the link in a Windows style argv", () => {
    expect(
      findDeepLinkArgument([
        "C:\\Joy Music.exe",
        "--flag",
        `joymusic://auth?code=abc&state=${state}`,
      ]),
    ).toBe(`joymusic://auth?code=abc&state=${state}`);
    expect(findDeepLinkArgument(["app", "--flag"])).toBeNull();
  });
});
