import jsQR from "jsqr";
import { describe, expect, it } from "vitest";
import { encodeQr } from "@joymusic/qr";
import { buildStageQrSvg } from "../../src/renderer/features/stage/stage-qr";
import { buildStageConfig, displayUrlOf } from "../../src/renderer/state/stage-control";
import { resolveStageTheme } from "../../src/renderer/features/stage/stage-screen";
import { makeState } from "./support/fake-bridge";

function decodeMatrix(matrix: boolean[][]): string | null {
  const scale = 6;
  const quiet = 4;
  const size = (matrix.length + quiet * 2) * scale;
  const pixels = new Uint8ClampedArray(size * size * 4).fill(255);
  matrix.forEach((row, y) => {
    row.forEach((dark, x) => {
      if (!dark) return;
      for (let dy = 0; dy < scale; dy += 1) {
        for (let dx = 0; dx < scale; dx += 1) {
          const px = ((y + quiet) * scale + dy) * size + (x + quiet) * scale + dx;
          pixels[px * 4] = 0;
          pixels[px * 4 + 1] = 0;
          pixels[px * 4 + 2] = 0;
        }
      }
    });
  });
  return jsQR(pixels, size, size)?.data ?? null;
}

describe("stage QR", () => {
  const url = "https://joymusic.uz/v/joy-demo-club";

  it("encodes the guest url with error correction high enough for the logo", () => {
    expect(decodeMatrix(encodeQr(url, { ecc: "H" }))).toBe(url);
  });

  it("renders a branded Joy Code svg for every theme", () => {
    for (const theme of ["club", "lounge", "cafe"] as const) {
      const svg = buildStageQrSvg(url, theme);
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toContain("Joy Code");
    }
  });

  it("builds the stage config from the live venue", () => {
    const venue = makeState().venue;
    const config = buildStageConfig(venue, "https://joymusic.uz/", "ru", "venue");
    expect(config.qrUrl).toBe("https://joymusic.uz/v/joy-demo-club");
    expect(config.displayUrl).toBe("joymusic.uz/v/joy-demo-club");
    expect(config.venueName).toBe("Joy Demo Club");
    expect(config.locale).toBe("ru");
    expect(displayUrlOf("http://localhost:3000/v/x/")).toBe("localhost:3000/v/x");
  });

  it("follows the venue theme unless the DJ forces one", () => {
    const venue = makeState().venue;
    const base = buildStageConfig(venue, "http://web.test", "en", "venue");
    expect(resolveStageTheme(base)).toBe("club");
    expect(resolveStageTheme({ ...base, venueTheme: "cafe" })).toBe("cafe");
    expect(resolveStageTheme({ ...base, themeOverride: "lounge" })).toBe("lounge");
    expect(resolveStageTheme(null)).toBe("club");
  });
});
