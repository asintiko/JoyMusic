import { describe, expect, it } from "vitest";
import { encodeQr, pixelSize, printTemplates, renderTemplate } from "../src/index";
import type { JoyLocale, JoyThemeName, PrintTemplate } from "../src/index";
import { brandLogo, crop, decode, rasterize, scanUrl } from "./helpers";
import type { Pixels } from "./helpers";

const matrix = encodeQr(scanUrl);
const logo = brandLogo();
const themes: JoyThemeName[] = ["club", "lounge", "cafe"];
const dpi = 150;

function decodeLayout(template: PrintTemplate, pixels: Pixels): (string | null)[] {
  if (template === "table-tent") {
    const half = Math.floor(pixels.height / 2);
    return [
      decode(crop(pixels, 0, 0, pixels.width, half)),
      decode(crop(pixels, 0, half, pixels.width, pixels.height - half)),
    ];
  }
  return [decode(pixels)];
}

describe.each(printTemplates)("%s scannability", (template) => {
  it.each(themes)("round-trips the URL in theme %s", (theme) => {
    const layout = renderTemplate(matrix, {
      template,
      theme,
      logo,
      venueName: "Bar Nuri",
      tableNumber: 7,
    });
    const size = pixelSize(layout, dpi);
    const pixels = rasterize(layout.svg, size.width);
    expect(decodeLayout(template, pixels).every((value) => value === scanUrl)).toBe(true);
  });

  it("round-trips with bleed and crop marks", () => {
    const layout = renderTemplate(matrix, {
      template,
      logo,
      venueName: "Bar Nuri",
      tableNumber: 12,
      bleedMm: 3,
      cropMarks: true,
    });
    const size = pixelSize(layout, dpi);
    const pixels = rasterize(layout.svg, size.width);
    expect(decodeLayout(template, pixels).every((value) => value === scanUrl)).toBe(true);
  });
});

describe("locales", () => {
  it.each(["uz", "ru", "en"] as JoyLocale[])("scans the %s poster at 300 dpi", (locale) => {
    const layout = renderTemplate(matrix, {
      template: "poster",
      theme: "club",
      logo,
      locale,
      venueName: locale === "ru" ? "Бар «Нур»" : "Oʻzbekiston Lounge",
      tableNumber: 5,
    });
    const size = pixelSize(layout, 300);
    expect(decode(rasterize(layout.svg, size.width))).toBe(scanUrl);
  });
});

describe("long payloads", () => {
  it("scans a higher version code with the logo cutout", () => {
    const longUrl = `${scanUrl}&utm=${"x".repeat(80)}`;
    const long = encodeQr(longUrl);
    const layout = renderTemplate(long, {
      template: "sticker",
      logo,
      venueName: "Bar Nuri",
      tableNumber: 3,
    });
    const size = pixelSize(layout, 300);
    expect(decode(rasterize(layout.svg, size.width))).toBe(longUrl);
  });
});
