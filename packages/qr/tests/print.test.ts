import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import {
  PNG_DPI,
  buildTableLayouts,
  createPdfFromPngs,
  encodeQr,
  formatTableLabel,
  pixelSize,
  readPngInfo,
  renderTemplate,
  setPngDpi,
  templateSpecs,
} from "../src/index";
import { renderBatchPdf, renderPdf, renderPng, renderTablesPdf } from "../src/node";
import { brandLogo, scanUrl } from "./helpers";

const matrix = encodeQr(scanUrl);
const logo = brandLogo();
const pointsPerMm = 72 / 25.4;

describe("templates", () => {
  it("uses true physical sizes", () => {
    const specs = templateSpecs;
    expect([specs.poster.width, specs.poster.height]).toEqual([210, 297]);
    expect([specs.sticker.width, specs.sticker.height]).toEqual([80, 80]);
    expect([specs["table-tent"].width, specs["table-tent"].height]).toEqual([105, 296]);
    expect([specs["tv-overlay"].width, specs["tv-overlay"].height]).toEqual([1920, 1080]);
  });

  it("declares mm width, height and a matching viewBox", () => {
    const poster = renderTemplate(matrix, { template: "poster", venueName: "Bar Nuri", logo });
    expect(poster.svg).toContain('width="210mm"');
    expect(poster.svg).toContain('height="297mm"');
    expect(poster.svg).toContain('viewBox="0 0 210 297"');
    const sticker = renderTemplate(matrix, { template: "sticker", venueName: "Bar Nuri", logo });
    expect(sticker.svg).toContain('width="80mm"');
    expect(sticker.svg).toContain('viewBox="0 0 80 80"');
    const tent = renderTemplate(matrix, { template: "table-tent", venueName: "Bar Nuri", logo });
    expect(tent.svg).toContain('width="105mm"');
    expect(tent.svg).toContain('height="296mm"');
  });

  it("declares the TV overlay in pixels without a background", () => {
    const tv = renderTemplate(matrix, { template: "tv-overlay", venueName: "Bar Nuri", logo });
    expect(tv.svg).toContain('width="1920"');
    expect(tv.svg).toContain('viewBox="0 0 1920 1080"');
    expect(tv.unit).toBe("px");
    expect(pixelSize(tv)).toEqual({ width: 1920, height: 1080 });
    expect(tv.svg).not.toMatch(/<rect[^>]*width="1920"/);
  });

  it("adds bleed and crop mark zones to the page", () => {
    const plain = renderTemplate(matrix, { template: "poster", venueName: "Bar", logo });
    const bleed = renderTemplate(matrix, {
      template: "poster",
      venueName: "Bar",
      logo,
      bleedMm: 3,
    });
    const marks = renderTemplate(matrix, {
      template: "poster",
      venueName: "Bar",
      logo,
      bleedMm: 3,
      cropMarks: true,
    });
    expect(bleed.widthMm).toBe(216);
    expect(bleed.heightMm).toBe(303);
    expect(marks.widthMm).toBe(232);
    expect(marks.heightMm).toBe(319);
    expect(marks.trimWidth).toBe(210);
    expect(marks.svg).toContain('stroke="#000000"');
    expect(plain.svg).not.toContain('stroke="#000000"');
  });

  it("computes 300 dpi pixel sizes", () => {
    const poster = renderTemplate(matrix, { template: "poster", venueName: "Bar", logo });
    expect(pixelSize(poster, 300)).toEqual({ width: 2480, height: 3508 });
    const sticker = renderTemplate(matrix, { template: "sticker", venueName: "Bar", logo });
    expect(pixelSize(sticker, 300)).toEqual({ width: 945, height: 945 });
  });

  it("includes the table label and the venue name as outlines", () => {
    const withLabel = renderTemplate(matrix, {
      template: "poster",
      venueName: "Bar Nuri",
      tableNumber: 7,
      locale: "uz",
      logo,
    });
    const other = renderTemplate(matrix, {
      template: "poster",
      venueName: "Bar Nuri",
      tableNumber: 8,
      locale: "uz",
      logo,
    });
    expect(withLabel.svg).not.toBe(other.svg);
    expect(withLabel.svg).not.toContain("<text");
    expect(formatTableLabel("uz", 7)).toBe("Stol 7");
    expect(formatTableLabel("ru", 7)).toBe("Стол 7");
    expect(formatTableLabel("en", 7)).toBe("Table 7");
  });

  it("reports glyphs it had to substitute", () => {
    const layout = renderTemplate(matrix, {
      template: "sticker",
      venueName: "龍 Bar",
      logo,
    });
    expect(layout.missingGlyphs).toEqual(["龍"]);
  });
});

describe("exports", () => {
  it("renders a 300 dpi PNG with the exact pixel size and dpi metadata", async () => {
    const layout = renderTemplate(matrix, { template: "poster", venueName: "Bar Nuri", logo });
    const png = await renderPng(layout, { dpi: PNG_DPI });
    const info = readPngInfo(png);
    expect(info.width).toBe(2480);
    expect(Math.abs(info.height - 3508)).toBeLessThanOrEqual(1);
    expect(info.dpi).toBe(300);
  });

  it("writes dpi metadata into any PNG once", async () => {
    const layout = renderTemplate(matrix, { template: "sticker", venueName: "Bar Nuri", logo });
    const png = await renderPng(layout, { dpi: 150 });
    expect(readPngInfo(png).dpi).toBe(150);
    expect(setPngDpi(png, 300)).toBe(png);
  });

  it("creates a PDF whose page has the exact physical size", async () => {
    const cases = [
      ["poster", 210, 297],
      ["sticker", 80, 80],
      ["table-tent", 105, 296],
    ] as const;
    for (const [template, widthMm, heightMm] of cases) {
      const layout = renderTemplate(matrix, { template, venueName: "Bar Nuri", logo });
      const pdf = await PDFDocument.load(await renderPdf(layout, { dpi: 150 }));
      expect(pdf.getPageCount()).toBe(1);
      const { width, height } = pdf.getPage(0).getSize();
      expect(width).toBeCloseTo(widthMm * pointsPerMm, 1);
      expect(height).toBeCloseTo(heightMm * pointsPerMm, 1);
    }
  });

  it("includes bleed and slug in the PDF page size", async () => {
    const layout = renderTemplate(matrix, {
      template: "poster",
      venueName: "Bar Nuri",
      logo,
      bleedMm: 3,
      cropMarks: true,
    });
    const pdf = await PDFDocument.load(await renderPdf(layout, { dpi: 100 }));
    const { width, height } = pdf.getPage(0).getSize();
    expect(width).toBeCloseTo(232 * pointsPerMm, 1);
    expect(height).toBeCloseTo(319 * pointsPerMm, 1);
  });

  it("builds a multi-page PDF for all tables", async () => {
    const bytes = await renderTablesPdf(
      {
        template: "table-tent",
        venueName: "Bar Nuri",
        locale: "ru",
        logo,
        tables: [1, 2, 3, 4].map((number) => ({
          url: `${scanUrl}&table=${number}`,
          tableNumber: number,
        })),
      },
      { dpi: 100 },
    );
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(4);
    for (const page of pdf.getPages()) {
      expect(page.getSize().width).toBeCloseTo(105 * pointsPerMm, 1);
      expect(page.getSize().height).toBeCloseTo(296 * pointsPerMm, 1);
    }
  });

  it("mixes layouts in one batch and keeps the TV overlay in pixel proportions", async () => {
    const layouts = [
      renderTemplate(matrix, { template: "poster", venueName: "Bar", logo }),
      renderTemplate(matrix, { template: "tv-overlay", venueName: "Bar", logo }),
    ];
    const pdf = await PDFDocument.load(await renderBatchPdf(layouts, { dpi: 72 }));
    expect(pdf.getPageCount()).toBe(2);
    const tv = pdf.getPage(1).getSize();
    expect(tv.width / tv.height).toBeCloseTo(16 / 9, 3);
  });

  it("builds per-table layouts with distinct codes", () => {
    const layouts = buildTableLayouts({
      template: "sticker",
      venueName: "Bar",
      logo,
      tables: [
        { url: `${scanUrl}&t=1`, tableNumber: 1 },
        { url: `${scanUrl}&t=2`, tableNumber: 2 },
      ],
    });
    expect(layouts).toHaveLength(2);
    expect(layouts[0]!.svg).not.toBe(layouts[1]!.svg);
  });

  it("assembles a PDF from ready PNG pages", async () => {
    const layout = renderTemplate(matrix, { template: "sticker", venueName: "Bar", logo });
    const png = await renderPng(layout, { dpi: 100 });
    const bytes = await createPdfFromPngs([{ png, widthMm: 80, heightMm: 80 }], {
      createdAt: new Date(0),
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBe(1);
  });
});
