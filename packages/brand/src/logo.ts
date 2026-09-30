import wordmarkData from "./generated/wordmark.json" with { type: "json" };

export const logoColors = {
  ultraviolet: "#7A5CFF",
  magenta: "#FF4FD8",
  ink: "#0A0812",
  paper: "#F5F2FF",
  white: "#FFFFFF",
  black: "#000000",
} as const;

export type LogoVariant = "mark" | "wordmark" | "lockup-horizontal" | "lockup-stacked";

export type LogoTone = "default" | "on-light" | "gradient" | "white" | "black" | "current";

export interface LogoSvgOptions {
  variant: LogoVariant;
  tone?: LogoTone;
  idPrefix?: string;
  title?: string;
  width?: number | string;
  height?: number | string;
}

export interface AppIconOptions {
  shape?: "squircle" | "square" | "circle";
  markScale?: number;
  glow?: boolean;
  mono?: boolean;
}

const markCenterX = 64;
const markCenterY = 72;
const markRadius = 34;
const markHalfStroke = 11;
const markStemTop = 22;
const markTickTop = 58;
const markModuleSize = 28;
const markModuleRadius = 10;

const stemX = markCenterX + markRadius;
const tickX = markCenterX - markRadius;
const outerRadius = markRadius + markHalfStroke;
const innerRadius = markRadius - markHalfStroke;

export const logoMarkViewBox = "0 0 128 128";

export const logoMarkBounds = {
  x: markCenterX - outerRadius,
  y: markStemTop - markHalfStroke,
  width: outerRadius * 2,
  height: markCenterY + outerRadius - (markStemTop - markHalfStroke),
} as const;

const moduleHalf = markModuleSize / 2;
const moduleLeft = markCenterX - moduleHalf;
const moduleTop = markCenterY - moduleHalf;
const moduleStraight = markModuleSize - markModuleRadius * 2;

export const logoMarkPaths = {
  body:
    `M${stemX - markHalfStroke} ${markStemTop}` +
    `A${markHalfStroke} ${markHalfStroke} 0 0 1 ${stemX + markHalfStroke} ${markStemTop}` +
    `V${markCenterY}` +
    `A${outerRadius} ${outerRadius} 0 0 1 ${tickX - markHalfStroke} ${markCenterY}` +
    `V${markTickTop}` +
    `A${markHalfStroke} ${markHalfStroke} 0 0 1 ${tickX + markHalfStroke} ${markTickTop}` +
    `V${markCenterY}` +
    `A${innerRadius} ${innerRadius} 0 0 0 ${stemX - markHalfStroke} ${markCenterY}Z`,
  module:
    `M${moduleLeft + markModuleRadius} ${moduleTop}` +
    `h${moduleStraight}` +
    `a${markModuleRadius} ${markModuleRadius} 0 0 1 ${markModuleRadius} ${markModuleRadius}` +
    `v${moduleStraight}` +
    `a${markModuleRadius} ${markModuleRadius} 0 0 1 -${markModuleRadius} ${markModuleRadius}` +
    `h-${moduleStraight}` +
    `a${markModuleRadius} ${markModuleRadius} 0 0 1 -${markModuleRadius} -${markModuleRadius}` +
    `v-${moduleStraight}` +
    `a${markModuleRadius} ${markModuleRadius} 0 0 1 ${markModuleRadius} -${markModuleRadius}Z`,
} as const;

export const logoMarkPath = `${logoMarkPaths.body}${logoMarkPaths.module}`;

export const logoMarkGradient = {
  x1: 96,
  y1: 12,
  x2: 34,
  y2: 118,
  from: logoColors.ultraviolet,
  to: logoColors.magenta,
} as const;

export const logoWordmark = {
  width: wordmarkData.width,
  height: wordmarkData.height,
  baseline: wordmarkData.baseline,
  capHeight: wordmarkData.capHeight,
  path: wordmarkData.path,
  accentPath: wordmarkData.accentPath,
  viewBox: `0 0 ${wordmarkData.width} ${wordmarkData.height}`,
} as const;

const horizontalCapHeight = 46;
const horizontalGap = 30;
const horizontalScale = horizontalCapHeight / wordmarkData.capHeight;
const horizontalWordmarkWidth = wordmarkData.width * horizontalScale;
const horizontalWordmarkX = logoMarkBounds.x + logoMarkBounds.width + horizontalGap;
const horizontalWordmarkY = 64 - (wordmarkData.baseline - wordmarkData.capHeight / 2) * horizontalScale;
const horizontalWidth = horizontalWordmarkX + horizontalWordmarkWidth - logoMarkBounds.x;

export const logoLockupHorizontal = {
  viewBox: `${logoMarkBounds.x} ${logoMarkBounds.y} ${round(horizontalWidth)} ${logoMarkBounds.height}`,
  width: round(horizontalWidth),
  height: logoMarkBounds.height,
  wordmarkTransform: `translate(${round(horizontalWordmarkX)} ${round(horizontalWordmarkY)}) scale(${round(horizontalScale, 5)})`,
} as const;

const stackedWordmarkWidth = 264;
const stackedScale = stackedWordmarkWidth / wordmarkData.width;
const stackedGap = 26;
const stackedWordmarkHeight = wordmarkData.height * stackedScale;
const stackedTop = logoMarkBounds.y;
const stackedWordmarkTop = logoMarkBounds.y + logoMarkBounds.height + stackedGap;
const stackedWidth = stackedWordmarkWidth;
const stackedHeight = stackedWordmarkTop + stackedWordmarkHeight - stackedTop;
const stackedLeft = markCenterX - stackedWidth / 2;

export const logoLockupStacked = {
  viewBox: `${round(stackedLeft)} ${stackedTop} ${stackedWidth} ${round(stackedHeight)}`,
  width: stackedWidth,
  height: round(stackedHeight),
  wordmarkTransform: `translate(${round(stackedLeft)} ${round(stackedWordmarkTop)}) scale(${round(stackedScale, 5)})`,
} as const;

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

interface ToneStyle {
  mark: string;
  wordmark: string;
  accent: string;
  usesMarkGradient: boolean;
  usesWordmarkGradient: boolean;
}

function toneStyle(tone: LogoTone, ids: { mark: string; word: string }): ToneStyle {
  switch (tone) {
    case "default":
      return {
        mark: `url(#${ids.mark})`,
        wordmark: logoColors.paper,
        accent: logoColors.magenta,
        usesMarkGradient: true,
        usesWordmarkGradient: false,
      };
    case "on-light":
      return {
        mark: `url(#${ids.mark})`,
        wordmark: logoColors.ink,
        accent: "#D92FB4",
        usesMarkGradient: true,
        usesWordmarkGradient: false,
      };
    case "gradient":
      return {
        mark: `url(#${ids.mark})`,
        wordmark: `url(#${ids.word})`,
        accent: `url(#${ids.word})`,
        usesMarkGradient: true,
        usesWordmarkGradient: true,
      };
    case "white":
      return {
        mark: logoColors.white,
        wordmark: logoColors.white,
        accent: logoColors.white,
        usesMarkGradient: false,
        usesWordmarkGradient: false,
      };
    case "black":
      return {
        mark: logoColors.black,
        wordmark: logoColors.black,
        accent: logoColors.black,
        usesMarkGradient: false,
        usesWordmarkGradient: false,
      };
    case "current":
      return {
        mark: "currentColor",
        wordmark: "currentColor",
        accent: "currentColor",
        usesMarkGradient: false,
        usesWordmarkGradient: false,
      };
  }
}

function markGradientDef(id: string): string {
  const g = logoMarkGradient;
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}"><stop offset="0" stop-color="${g.from}"/><stop offset="1" stop-color="${g.to}"/></linearGradient>`;
}

function wordmarkGradientDef(id: string): string {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${wordmarkData.width}" y2="0"><stop offset="0" stop-color="${logoColors.ultraviolet}"/><stop offset="1" stop-color="${logoColors.magenta}"/></linearGradient>`;
}

function markElement(fill: string): string {
  return `<path fill="${fill}" d="${logoMarkPath}"/>`;
}

function wordmarkElements(style: ToneStyle): string {
  const body = `<path fill="${style.wordmark}" d="${logoWordmark.path}"/>`;
  const accent = `<path fill="${style.accent}" d="${logoWordmark.accentPath}"/>`;
  return `${body}${accent}`;
}

const variantLabel: Record<LogoVariant, string> = {
  mark: "Joy Music",
  wordmark: "Joy Music",
  "lockup-horizontal": "Joy Music",
  "lockup-stacked": "Joy Music",
};

export function buildLogoSvg(options: LogoSvgOptions): string {
  const tone = options.tone ?? "default";
  const prefix = options.idPrefix ?? "jm";
  const ids = { mark: `${prefix}-mark-gradient`, word: `${prefix}-word-gradient` };
  const style = toneStyle(tone, ids);
  const label = options.title ?? variantLabel[options.variant];

  const lockup =
    options.variant === "lockup-horizontal"
      ? logoLockupHorizontal
      : options.variant === "lockup-stacked"
        ? logoLockupStacked
        : null;

  let viewBox: string = logoMarkViewBox;
  let width = 128;
  let height = 128;
  let body = markElement(style.mark);

  if (options.variant === "wordmark") {
    viewBox = logoWordmark.viewBox;
    width = logoWordmark.width;
    height = logoWordmark.height;
    body = wordmarkElements(style);
  } else if (lockup) {
    viewBox = lockup.viewBox;
    width = lockup.width;
    height = lockup.height;
    body = `${markElement(style.mark)}<g transform="${lockup.wordmarkTransform}">${wordmarkElements(style)}</g>`;
  }

  const includesWordmark = options.variant !== "mark";
  const defs =
    (style.usesMarkGradient ? markGradientDef(ids.mark) : "") +
    (style.usesWordmarkGradient && includesWordmark ? wordmarkGradientDef(ids.word) : "");

  const outWidth = options.width ?? Math.round(width);
  const outHeight = options.height ?? Math.round(height);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${outWidth}" height="${outHeight}" role="img" aria-label="${label}">` +
    `<title>${label}</title>` +
    (defs ? `<defs>${defs}</defs>` : "") +
    body +
    `</svg>`
  );
}

export function buildAppIconSvg(options: AppIconOptions = {}): string {
  const shape = options.shape ?? "squircle";
  const markScale = options.markScale ?? 0.6;
  const glow = options.glow ?? true;
  const mono = options.mono ?? false;
  const size = 1024;
  const markSize = size * markScale;
  const markOffset = (size - markSize) / 2;
  const scale = markSize / 128;
  const cornerRadius = shape === "squircle" ? 232 : shape === "circle" ? size / 2 : 0;
  const clip =
    shape === "square"
      ? ""
      : `<clipPath id="icon-clip"><rect width="${size}" height="${size}" rx="${cornerRadius}"/></clipPath>`;
  const clipAttr = shape === "square" ? "" : ' clip-path="url(#icon-clip)"';
  const background = mono
    ? `<rect width="${size}" height="${size}" fill="${logoColors.ink}"/>`
    : `<rect width="${size}" height="${size}" fill="${logoColors.ink}"/>` +
      (glow
        ? `<rect width="${size}" height="${size}" fill="url(#icon-glow-a)"/><rect width="${size}" height="${size}" fill="url(#icon-glow-b)"/>`
        : "");
  const markFill = mono ? logoColors.white : "url(#icon-mark)";
  const g = logoMarkGradient;
  const defs =
    `<defs>${clip}` +
    `<radialGradient id="icon-glow-a" cx="0.22" cy="0.12" r="0.75"><stop offset="0" stop-color="${logoColors.ultraviolet}" stop-opacity="0.42"/><stop offset="1" stop-color="${logoColors.ultraviolet}" stop-opacity="0"/></radialGradient>` +
    `<radialGradient id="icon-glow-b" cx="0.85" cy="0.95" r="0.7"><stop offset="0" stop-color="${logoColors.magenta}" stop-opacity="0.34"/><stop offset="1" stop-color="${logoColors.magenta}" stop-opacity="0"/></radialGradient>` +
    `<linearGradient id="icon-mark" gradientUnits="userSpaceOnUse" x1="${g.x1}" y1="${g.y1}" x2="${g.x2}" y2="${g.y2}"><stop offset="0" stop-color="#9B85FF"/><stop offset="1" stop-color="${logoColors.magenta}"/></linearGradient>` +
    `</defs>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">` +
    defs +
    `<g${clipAttr}>${background}<g transform="translate(${markOffset} ${markOffset}) scale(${scale})"><path fill="${markFill}" d="${logoMarkPath}"/></g></g>` +
    `</svg>`
  );
}

export const logoMarkSvg = buildLogoSvg({ variant: "mark", tone: "gradient" });
export const logoMarkWhiteSvg = buildLogoSvg({ variant: "mark", tone: "white" });
export const logoMarkBlackSvg = buildLogoSvg({ variant: "mark", tone: "black" });
export const logoWordmarkSvg = buildLogoSvg({ variant: "wordmark", tone: "default" });
export const logoLockupHorizontalSvg = buildLogoSvg({ variant: "lockup-horizontal", tone: "default" });
export const logoLockupStackedSvg = buildLogoSvg({ variant: "lockup-stacked", tone: "default" });
