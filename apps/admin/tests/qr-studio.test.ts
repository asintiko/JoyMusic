import { describe, expect, it } from "vitest";
import {
  bulkLabels,
  buildLayout,
  defaultStudioOptions,
  exportFileName,
  naturalCompare,
  nextTableNumber,
  studioTemplates,
  svgDataUrl,
} from "../src/lib/qr-studio";

const venue = { name: "Joy Demo Club", slug: "joy-demo-club", theme: "club" as const };
const code = { label: "Table 7", url: "http://localhost:3000/v/joy-demo-club?t=Xk3fA9qLmP2z" };

describe("QR studio layouts", () => {
  it.each(studioTemplates)("renders the %s template as SVG", (template) => {
    const layout = buildLayout(code, venue, { ...defaultStudioOptions, template });
    expect(layout.svg.startsWith("<svg")).toBe(true);
    expect(layout.template).toBe(template);
    expect(layout.width).toBeGreaterThan(0);
  });

  it("adds bleed and crop marks only for print templates", () => {
    const flat = buildLayout(code, venue, defaultStudioOptions);
    const bleed = buildLayout(code, venue, {
      ...defaultStudioOptions,
      bleed: true,
      cropMarks: true,
    });
    expect(bleed.widthMm).toBeGreaterThan(flat.widthMm);
    const tv = buildLayout(code, venue, {
      ...defaultStudioOptions,
      template: "tv-overlay",
      bleed: true,
      cropMarks: true,
    });
    expect(tv.bleedMm).toBe(0);
  });

  it("changes the artwork when the theme changes", () => {
    const club = buildLayout(code, venue, defaultStudioOptions);
    const cafe = buildLayout(code, { ...venue, theme: "cafe" }, defaultStudioOptions);
    expect(club.svg).not.toBe(cafe.svg);
  });

  it("builds a data URL that round-trips", () => {
    const url = svgDataUrl("<svg></svg>");
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(decodeURIComponent(url.split(",")[1] ?? "")).toBe("<svg></svg>");
  });
});

describe("QR studio helpers", () => {
  it("names export files predictably", () => {
    expect(exportFileName(venue, "Table 7", "poster", "pdf")).toBe(
      "joy-demo-club-table-7-poster.pdf",
    );
    expect(exportFileName(venue, null, "sticker", "pdf")).toBe(
      "joy-demo-club-all-tables-sticker.pdf",
    );
  });
  it("continues table numbering", () => {
    expect(nextTableNumber([])).toBe(1);
    expect(nextTableNumber(["Table 1", "Table 10", "Bar", "Стол 3"])).toBe(11);
  });
  it("creates bulk labels within the length limit", () => {
    expect(bulkLabels("Table", 4, 3)).toEqual(["Table 4", "Table 5", "Table 6"]);
    expect(bulkLabels("", 1, 1)).toEqual(["Table 1"]);
    expect(bulkLabels("x".repeat(60), 1, 1)[0]?.length).toBeLessThanOrEqual(40);
  });
  it("sorts labels naturally", () => {
    expect(["Table 10", "Table 2", "Bar", "Table 1"].sort(naturalCompare)).toEqual([
      "Bar",
      "Table 1",
      "Table 2",
      "Table 10",
    ]);
  });
});
