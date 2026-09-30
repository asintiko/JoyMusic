import { brandLabel, formatTableLabel, posterSubtitles, resolveHeadline, stepLabels } from "./copy";
import type { JoyLocale } from "./copy";
import { num } from "./format";
import { buildFramedCode } from "./joycode";
import type { CodeArtwork, JoyCodeStyle } from "./joycode";
import type { QrMatrix } from "./matrix";
import { circlePath, roundedRectPath, svgDocument } from "./svg";
import { arcTextPathData, fitTextSize, layoutText, textPathData } from "./text";
import type { TextAnchor, TextStyle } from "./text";
import { resolvePalette } from "./themes";
import type { JoyPalette } from "./themes";

export type PrintTemplate = "table-tent" | "sticker" | "poster" | "tv-overlay";

export const printTemplates: readonly PrintTemplate[] = [
  "table-tent",
  "sticker",
  "poster",
  "tv-overlay",
];

export interface TemplateSpec {
  unit: "mm" | "px";
  width: number;
  height: number;
  label: string;
}

export const templateSpecs: Record<PrintTemplate, TemplateSpec> = {
  "table-tent": { unit: "mm", width: 105, height: 296, label: "Table tent A6 (two panels, flat)" },
  sticker: { unit: "mm", width: 80, height: 80, label: "Round sticker 80 mm" },
  poster: { unit: "mm", width: 210, height: 297, label: "Poster A4" },
  "tv-overlay": { unit: "px", width: 1920, height: 1080, label: "TV overlay 1920x1080" },
};

export const CROP_MARK_ZONE_MM = 8;
export const PX_PER_INCH_SCREEN = 96;

export interface TemplateOptions extends JoyCodeStyle {
  template: PrintTemplate;
  venueName: string;
  tableLabel?: string;
  tableNumber?: string | number;
  locale?: JoyLocale;
  headline?: string | false;
  bleedMm?: number;
  cropMarks?: boolean;
  title?: string;
}

export interface PrintLayout {
  template: PrintTemplate;
  svg: string;
  unit: "mm" | "px";
  width: number;
  height: number;
  trimWidth: number;
  trimHeight: number;
  bleedMm: number;
  slugMm: number;
  widthMm: number;
  heightMm: number;
  missingGlyphs: string[];
}

export interface PixelSize {
  width: number;
  height: number;
}

export function pixelSize(layout: PrintLayout, dpi = 300): PixelSize {
  if (layout.unit === "px") return { width: layout.width, height: layout.height };
  return {
    width: Math.round((layout.widthMm / 25.4) * dpi),
    height: Math.round((layout.heightMm / 25.4) * dpi),
  };
}

class Canvas {
  readonly defs: string[] = [];
  readonly body: string[] = [];
  readonly missing: string[] = [];

  constructor(
    readonly palette: JoyPalette,
    readonly prefix: string,
  ) {}

  text(
    value: string,
    style: TextStyle,
    x: number,
    baseline: number,
    options: { anchor?: TextAnchor; maxWidth?: number; minSize?: number; fill: string },
  ): number {
    const size = options.maxWidth
      ? fitTextSize(value, style, options.maxWidth, options.minSize ?? style.size * 0.4)
      : style.size;
    const layout = layoutText(value, { ...style, size });
    this.missing.push(...layout.missing);
    this.body.push(
      `<path fill="${options.fill}" d="${textPathData(layout, x, baseline, options.anchor ?? "start")}"/>`,
    );
    return layout.capHeight;
  }

  arcText(
    value: string,
    style: TextStyle,
    cx: number,
    cy: number,
    radius: number,
    side: "top" | "bottom",
    maxWidth: number,
    fill: string,
  ): void {
    const size = fitTextSize(value, style, maxWidth, style.size * 0.5);
    const layout = layoutText(value, { ...style, size });
    this.missing.push(...layout.missing);
    this.body.push(`<path fill="${fill}" d="${arcTextPathData(layout, cx, cy, radius, side)}"/>`);
  }
}

function backgroundDefs(prefix: string, palette: JoyPalette): string {
  return (
    `<linearGradient id="${prefix}-bg" x1="0" y1="0" x2="0.35" y2="1"><stop offset="0" stop-color="${palette.canvasAlt}"/><stop offset="0.6" stop-color="${palette.canvas}"/><stop offset="1" stop-color="${palette.canvas}"/></linearGradient>` +
    `<radialGradient id="${prefix}-glow-a"><stop offset="0" stop-color="${palette.accent}" stop-opacity="0.42"/><stop offset="1" stop-color="${palette.accent}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="${prefix}-glow-b"><stop offset="0" stop-color="${palette.accentEnd}" stop-opacity="0.32"/><stop offset="1" stop-color="${palette.accentEnd}" stop-opacity="0"/></radialGradient>`
  );
}

function accentGradient(prefix: string, palette: JoyPalette, x1: number, x2: number): string {
  return `<linearGradient id="${prefix}-acc" gradientUnits="userSpaceOnUse" x1="${num(x1)}" y1="0" x2="${num(x2)}" y2="0"><stop offset="0" stop-color="${palette.accent}"/><stop offset="1" stop-color="${palette.accentEnd}"/></linearGradient>`;
}

function place(art: CodeArtwork, x: number, y: number, width: number): string {
  const scale = width / art.width;
  return `<g transform="translate(${num(x)} ${num(y)}) scale(${num(scale)})">${art.body}</g>`;
}

function artHeight(art: CodeArtwork, width: number): number {
  return (art.height * width) / art.width;
}

function backdrop(
  canvas: Canvas,
  x: number,
  y: number,
  width: number,
  height: number,
  glows: { ax: number; ay: number; ar: number; bx: number; by: number; br: number },
): void {
  const p = canvas.prefix;
  canvas.body.push(
    `<rect x="${num(x)}" y="${num(y)}" width="${num(width)}" height="${num(height)}" fill="url(#${p}-bg)"/>`,
    `<circle cx="${num(glows.ax)}" cy="${num(glows.ay)}" r="${num(glows.ar)}" fill="url(#${p}-glow-a)"/>`,
    `<circle cx="${num(glows.bx)}" cy="${num(glows.by)}" r="${num(glows.br)}" fill="url(#${p}-glow-b)"/>`,
  );
}

interface TemplateContext {
  canvas: Canvas;
  matrix: QrMatrix;
  options: TemplateOptions;
  locale: JoyLocale | undefined;
  tableLabel: string;
  bleed: number;
  artStyle: JoyCodeStyle;
}

function frameArt(context: TemplateContext, footer: string | false): CodeArtwork {
  const { options, locale } = context;
  const art = buildFramedCode(context.matrix, {
    ...context.artStyle,
    idPrefix: `${context.canvas.prefix}c`,
    footer,
    headline: options.headline,
    locale,
  });
  context.canvas.missing.push(...art.missingGlyphs);
  context.canvas.defs.push(art.defs);
  return art;
}

function drawPoster(context: TemplateContext): void {
  const { canvas, bleed } = context;
  const { palette } = canvas;
  const width = 210;
  const height = 297;
  backdrop(canvas, -bleed, -bleed, width + 2 * bleed, height + 2 * bleed, {
    ax: 20,
    ay: 10,
    ar: 150,
    bx: 195,
    by: 290,
    br: 170,
  });
  const locale = context.locale ?? "en";
  canvas.text(
    brandLabel.toUpperCase(),
    { family: "manrope", weight: 700, size: 4, tracking: 0.32 },
    width / 2,
    22,
    { anchor: "middle", fill: palette.textMuted },
  );
  canvas.text(
    context.options.venueName,
    { family: "unbounded", weight: 700, size: 13, tracking: 0.01 },
    width / 2,
    38,
    { anchor: "middle", maxWidth: 172, fill: palette.text },
  );
  canvas.text(
    posterSubtitles[locale],
    { family: "manrope", weight: 500, size: 5, tracking: 0.02 },
    width / 2,
    48,
    { anchor: "middle", maxWidth: 172, fill: palette.textMuted },
  );
  const art = frameArt(context, context.tableLabel);
  const cardWidth = 150;
  canvas.body.push(place(art, (width - cardWidth) / 2, 56, cardWidth));
  const cardBottom = 56 + artHeight(art, cardWidth);
  const steps = stepLabels[locale];
  const columnWidth = 56;
  const gap = 6;
  const startX = (width - (columnWidth * 3 + gap * 2)) / 2;
  const rowY = Math.min(cardBottom + 15, height - 14);
  steps.forEach((label, index) => {
    const x = startX + index * (columnWidth + gap);
    const cx = x + 5.5;
    canvas.body.push(`<path fill="url(#${canvas.prefix}-acc)" d="${circlePath(cx, rowY, 5.5)}"/>`);
    canvas.text(String(index + 1), { family: "unbounded", weight: 700, size: 5.6 }, cx, rowY + 2, {
      anchor: "middle",
      fill: palette.canvas,
    });
    canvas.text(
      label,
      { family: "manrope", weight: 700, size: 4, tracking: 0.01 },
      x + 13,
      rowY + 1.3,
      { anchor: "start", maxWidth: columnWidth - 14, fill: palette.text },
    );
  });
}

function drawTentPanel(context: TemplateContext, art: CodeArtwork): string {
  const { canvas } = context;
  const { palette } = canvas;
  const width = 105;
  const height = 148;
  const inner = new Canvas(palette, canvas.prefix);
  inner.text(
    context.options.venueName,
    { family: "unbounded", weight: 700, size: 6.4, tracking: 0.01 },
    width / 2,
    17,
    { anchor: "middle", maxWidth: 86, fill: palette.text },
  );
  const cardWidth = 84;
  inner.body.push(place(art, (width - cardWidth) / 2, 24, cardWidth));
  inner.text(
    brandLabel.toUpperCase(),
    { family: "manrope", weight: 700, size: 2.6, tracking: 0.32 },
    width / 2,
    height - 7,
    { anchor: "middle", fill: palette.textMuted },
  );
  canvas.missing.push(...inner.missing);
  return inner.body.join("");
}

function drawTent(context: TemplateContext): void {
  const { canvas, bleed } = context;
  const { palette } = canvas;
  const width = 105;
  const height = 296;
  backdrop(canvas, -bleed, -bleed, width + 2 * bleed, height + 2 * bleed, {
    ax: 10,
    ay: 30,
    ar: 90,
    bx: 100,
    by: 270,
    br: 100,
  });
  const art = frameArt(context, context.tableLabel);
  const panel = drawTentPanel(context, art);
  canvas.body.push(
    `<g transform="rotate(180 ${width / 2} 74)">${panel}</g>`,
    `<g transform="translate(0 148)">${panel}</g>`,
    `<path fill="none" stroke="${palette.textMuted}" stroke-opacity="0.6" stroke-width="0.25" stroke-dasharray="2 1.6" d="M0 148H${width}"/>`,
  );
}

function drawSticker(context: TemplateContext): void {
  const { canvas, bleed } = context;
  const { palette } = canvas;
  const center = 40;
  const radius = 40 + bleed;
  canvas.defs.push(
    `<radialGradient id="${canvas.prefix}-disc" cx="0.3" cy="0.2" r="0.95"><stop offset="0" stop-color="${palette.canvasAlt}"/><stop offset="0.7" stop-color="${palette.canvas}"/><stop offset="1" stop-color="${palette.canvas}"/></radialGradient>`,
  );
  canvas.body.push(
    `<path fill="url(#${canvas.prefix}-disc)" d="${circlePath(center, center, radius)}"/>`,
  );
  canvas.body.push(
    `<path fill="none" stroke="url(#${canvas.prefix}-acc)" stroke-width="0.7" d="${circlePath(center, center, 38)}"/>`,
  );
  const art = buildFramedCode(context.matrix, {
    ...context.artStyle,
    idPrefix: `${canvas.prefix}c`,
    frame: false,
  });
  canvas.defs.push(art.defs);
  const side = 41;
  const origin = center - side / 2;
  canvas.body.push(
    `<path fill="none" stroke="url(#${canvas.prefix}-acc)" stroke-width="0.45" d="${roundedRectPath(origin - 1.2, origin - 1.2, side + 2.4, side + 2.4, 5)}"/>`,
    place(art, origin, origin, side),
  );
  const headline = resolveHeadline(context.options.headline, context.locale);
  if (headline) {
    canvas.arcText(
      headline,
      { family: "unbounded", weight: 700, size: 3.3, tracking: 0.03 },
      center,
      center,
      32.2,
      "top",
      32.2 * 1.9,
      `url(#${canvas.prefix}-acc)`,
    );
  }
  const bottom = [context.tableLabel, context.options.venueName].filter(Boolean).join(" · ");
  canvas.arcText(
    bottom,
    { family: "unbounded", weight: 700, size: 3.1, tracking: 0.03 },
    center,
    center,
    35,
    "bottom",
    35 * 1.9,
    palette.text,
  );
  for (const dx of [-1, 1]) {
    canvas.body.push(
      `<path fill="url(#${canvas.prefix}-acc)" d="${circlePath(center + dx * 35.4, center, 0.95)}"/>`,
    );
  }
}

function drawTv(context: TemplateContext): void {
  const { canvas } = context;
  const art = frameArt(context, context.options.venueName);
  const cardWidth = 440;
  const margin = 56;
  const cardHeight = artHeight(art, cardWidth);
  canvas.body.push(place(art, 1920 - margin - cardWidth, 1080 - margin - cardHeight, cardWidth));
}

function cropMarks(trimWidth: number, trimHeight: number, bleed: number, folds: number[]): string {
  const gap = bleed + 1.2;
  const length = 4.5;
  const lines: string[] = [];
  const xs = [0, trimWidth];
  const ys = [0, trimHeight, ...folds];
  for (const x of xs) {
    for (const y of ys) {
      const left = x === 0 ? -gap - length : trimWidth + gap;
      lines.push(`M${num(left)} ${num(y)}h${length}`);
    }
  }
  for (const x of xs) {
    const top = -gap - length;
    const bottom = trimHeight + gap;
    lines.push(`M${num(x)} ${num(top)}v${length}`, `M${num(x)} ${num(bottom)}v${length}`);
  }
  return `<path fill="none" stroke="#000000" stroke-width="0.15" d="${lines.join("")}"/>`;
}

function circleCutMarks(center: number, radius: number): string {
  return `<path fill="none" stroke="#FF00FF" stroke-width="0.15" stroke-dasharray="1.2 0.8" d="${circlePath(center, center, radius)}"/>`;
}

export function renderTemplate(matrix: QrMatrix, options: TemplateOptions): PrintLayout {
  const spec = templateSpecs[options.template];
  const palette = resolvePalette(options.theme);
  const physical = spec.unit === "mm";
  const bleed = physical ? Math.max(0, options.bleedMm ?? 0) : 0;
  const marks = physical && options.cropMarks === true;
  const slug = physical ? bleed + (marks ? CROP_MARK_ZONE_MM : 0) : 0;
  const locale = options.locale;
  const tableLabel =
    options.tableLabel ??
    (options.tableNumber !== undefined
      ? formatTableLabel(locale ?? "en", options.tableNumber)
      : "");
  const canvas = new Canvas(palette, "t");
  canvas.defs.push(backgroundDefs("t", palette));
  canvas.defs.push(accentGradient("t", palette, 0, spec.width));
  const artStyle: JoyCodeStyle = {
    theme: options.theme,
    gradient: options.gradient,
    moduleStyle: options.moduleStyle,
    eyeStyle: options.eyeStyle,
    logo: options.logo,
    logoScale: options.logoScale,
    quietZone: options.quietZone,
  };
  const context: TemplateContext = { canvas, matrix, options, locale, tableLabel, bleed, artStyle };
  if (options.template === "poster") drawPoster(context);
  else if (options.template === "table-tent") drawTent(context);
  else if (options.template === "sticker") drawSticker(context);
  else drawTv(context);

  const pageWidth = spec.width + 2 * slug;
  const pageHeight = spec.height + 2 * slug;
  const clipId = "t-clip";
  const clip = `<clipPath id="${clipId}"><rect x="${num(-bleed)}" y="${num(-bleed)}" width="${num(spec.width + 2 * bleed)}" height="${num(spec.height + 2 * bleed)}"/></clipPath>`;
  const content = physical
    ? `<g transform="translate(${num(slug)} ${num(slug)})"><g clip-path="url(#${clipId})">${canvas.body.join("")}</g>${marks ? cropMarks(spec.width, spec.height, bleed, options.template === "table-tent" ? [148] : []) : ""}${marks && options.template === "sticker" ? circleCutMarks(40, 40) : ""}</g>`
    : canvas.body.join("");
  const title = options.title ?? `${options.venueName} ${spec.label}`;
  const svg = svgDocument({
    width: physical ? `${num(pageWidth)}mm` : String(pageWidth),
    height: physical ? `${num(pageHeight)}mm` : String(pageHeight),
    viewBox: `0 0 ${num(pageWidth)} ${num(pageHeight)}`,
    title,
    parts: { defs: canvas.defs.join("") + (physical ? clip : ""), body: content },
  });
  const widthMm = physical ? pageWidth : (pageWidth * 25.4) / PX_PER_INCH_SCREEN;
  const heightMm = physical ? pageHeight : (pageHeight * 25.4) / PX_PER_INCH_SCREEN;
  return {
    template: options.template,
    svg,
    unit: spec.unit,
    width: pageWidth,
    height: pageHeight,
    trimWidth: spec.width,
    trimHeight: spec.height,
    bleedMm: bleed,
    slugMm: slug,
    widthMm,
    heightMm,
    missingGlyphs: [...new Set(canvas.missing)],
  };
}
