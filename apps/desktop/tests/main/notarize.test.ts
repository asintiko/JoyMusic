import { describe, expect, it } from "vitest";
import notarizeApp, { missingSecrets } from "../../build/notarize.mjs";

describe("notarize hook", () => {
  it("lists the missing Apple secrets", () => {
    expect(missingSecrets({})).toEqual([
      "APPLE_ID",
      "APPLE_APP_SPECIFIC_PASSWORD",
      "APPLE_TEAM_ID",
    ]);
    expect(missingSecrets({ APPLE_ID: "a", APPLE_TEAM_ID: "t" })).toEqual([
      "APPLE_APP_SPECIFIC_PASSWORD",
    ]);
    expect(
      missingSecrets({ APPLE_ID: "a", APPLE_APP_SPECIFIC_PASSWORD: "p", APPLE_TEAM_ID: "t" }),
    ).toEqual([]);
  });

  it("does nothing on other platforms and without secrets", async () => {
    await expect(notarizeApp({ electronPlatformName: "win32" })).resolves.toBeUndefined();
    const previous = { ...process.env };
    delete process.env.APPLE_ID;
    delete process.env.APPLE_APP_SPECIFIC_PASSWORD;
    delete process.env.APPLE_TEAM_ID;
    try {
      await expect(
        notarizeApp({
          electronPlatformName: "darwin",
          appOutDir: "/nowhere",
          packager: { appInfo: { productFilename: "Joy Music" } },
        }),
      ).resolves.toBeUndefined();
    } finally {
      process.env = previous;
    }
  });
});
