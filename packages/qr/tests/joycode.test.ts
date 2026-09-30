import { describe, expect, it } from "vitest";
import {
  MAX_LOGO_AREA_RATIO,
  contrastRatio,
  encodeQr,
  joyThemes,
  localizedHeadlines,
  logoCutout,
  minimumModuleContrast,
  renderJoyCode,
  resolvePalette,
} from "../src/index";
import { brandLogo, crop, decode, inlineLogo, rasterize, scanUrl } from "./helpers";

const matrix = encodeQr(scanUrl);

describe("renderJoyCode", () => {
  it("is deterministic for a fixed input", () => {
    const options = { theme: "club", logo: inlineLogo, footer: "Stol 7" } as const;
    expect(renderJoyCode(matrix, options)).toBe(renderJoyCode(matrix, options));
  });

  it("matches the stored SVG for a fixed input", async () => {
    const svg = renderJoyCode(encodeQr("https://joymusic.uz/v/demo?t=abc123"), {
      theme: "club",
      logo: inlineLogo,
      footer: "Stol 7",
    });
    await expect(svg).toMatchFileSnapshot("./__snapshots__/joycode-club.svg");
  });

  it("contains no text nodes so it renders without fonts", () => {
    const svg = renderJoyCode(matrix, { logo: inlineLogo, footer: "Стол 7", locale: "ru" });
    expect(svg).not.toContain("<text");
    expect(svg).not.toContain("font-family");
  });

  it("accepts a full svg document or a bare fragment as the logo", () => {
    const full = renderJoyCode(matrix, { logo: brandLogo() });
    const fragment = renderJoyCode(matrix, {
      logo: { svg: "<circle cx='5' cy='5' r='5' fill='red'/>", viewBox: "0 0 10 10" },
    });
    expect(full).toContain("jc-logo-jm-mark-gradient");
    expect(fragment).toContain("fill='red'");
    expect(() => renderJoyCode(matrix, { logo: { svg: "<circle r='1'/>" } })).toThrow();
  });

  it("renders localized headlines as outlines", () => {
    const en = renderJoyCode(matrix, {});
    const ru = renderJoyCode(matrix, { locale: "ru" });
    const uz = renderJoyCode(matrix, { locale: "uz" });
    expect(new Set([en, ru, uz]).size).toBe(3);
    expect(localizedHeadlines.en).toBe("Scan · Order · Dance");
  });

  it("supports a custom headline, no headline and no frame", () => {
    const framed = renderJoyCode(matrix, {});
    expect(renderJoyCode(matrix, { headline: "Zaказ" })).not.toBe(framed);
    expect(renderJoyCode(matrix, { headline: false })).not.toBe(framed);
    const bare = renderJoyCode(matrix, { frame: false });
    expect(bare.length).toBeLessThan(framed.length);
  });

  it("supports custom themes with a base preset", () => {
    const palette = resolvePalette({ base: "lounge", accent: "#FF0000" });
    expect(palette.accent).toBe("#FF0000");
    expect(palette.panel).toBe(joyThemes.lounge.panel);
    const svg = renderJoyCode(matrix, { theme: { base: "cafe", modules: "#112233" } });
    expect(svg).toContain("#112233");
  });

  it("can turn the module gradient off", () => {
    expect(renderJoyCode(matrix, { gradient: false })).not.toContain("-mod");
    expect(renderJoyCode(matrix, { gradient: true })).toContain("-mod");
  });

  it("keeps dark modules readable against the light panel in every preset", () => {
    for (const palette of Object.values(joyThemes)) {
      for (const colour of [palette.modules, palette.modulesEnd, palette.eye, palette.eyeCore]) {
        expect(contrastRatio(colour, palette.panel)).toBeGreaterThanOrEqual(minimumModuleContrast);
      }
    }
  });
});

describe("logo guard", () => {
  it("never removes more than 18 percent of the code area", () => {
    for (let version = 1; version <= 40; version += 1) {
      const size = 17 + 4 * version;
      for (const scale of [0.1, 0.2, 0.28, 0.4, 0.6, 1]) {
        const cutout = logoCutout(size, scale);
        if (cutout) {
          expect(cutout.areaRatio).toBeLessThanOrEqual(MAX_LOGO_AREA_RATIO);
          expect(cutout.modules % 2).toBe(1);
        }
      }
    }
  });

  it("keeps the cutout clear of the finder patterns", () => {
    for (let version = 1; version <= 40; version += 1) {
      const size = 17 + 4 * version;
      const cutout = logoCutout(size, 1);
      if (cutout) {
        expect(cutout.start).toBeGreaterThanOrEqual(9);
        expect(cutout.start + cutout.modules).toBeLessThanOrEqual(size - 9);
      }
    }
  });

  it("clamps an oversized request and still produces a scannable code", () => {
    const requested = logoCutout(matrix.length, 5)!;
    const normal = logoCutout(matrix.length)!;
    expect(requested.areaRatio).toBeLessThanOrEqual(MAX_LOGO_AREA_RATIO);
    expect(requested.modules).toBeGreaterThanOrEqual(normal.modules);
    const svg = renderJoyCode(matrix, { logo: brandLogo(), logoScale: 5, frame: false });
    expect(decode(rasterize(svg, 900))).toBe(scanUrl);
  });

  it("does not cut anything without a logo", () => {
    const withLogo = renderJoyCode(matrix, { logo: inlineLogo });
    const without = renderJoyCode(matrix, {});
    expect(withLogo).not.toBe(without);
  });
});

describe("scan of the bare code", () => {
  it("decodes every module and eye style", () => {
    for (const moduleStyle of ["rounded", "dots", "square"] as const) {
      for (const eyeStyle of ["rounded", "circle", "square"] as const) {
        const svg = renderJoyCode(matrix, { moduleStyle, eyeStyle, logo: brandLogo() });
        for (const width of [600, 900, 1400]) {
          expect(decode(rasterize(svg, width))).toBe(scanUrl);
        }
      }
    }
  });

  it("decodes with and without gradient", () => {
    for (const gradient of [true, false]) {
      const svg = renderJoyCode(matrix, { gradient, logo: brandLogo() });
      expect(decode(rasterize(svg, 700))).toBe(scanUrl);
    }
  });

  it("decodes a cropped panel with only the minimum quiet zone", () => {
    const svg = renderJoyCode(matrix, { quietZone: 4, frame: false, logo: brandLogo() });
    const pixels = rasterize(svg, 600);
    expect(decode(crop(pixels, 0, 0, pixels.width, pixels.height))).toBe(scanUrl);
  });
});
