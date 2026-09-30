import { resolveHeadline } from "./copy";
import type { JoyLocale } from "./copy";
import { clamp, num } from "./format";
import { assertMatrix } from "./matrix";
import type { QrMatrix } from "./matrix";
import { prepareLogo, roundedRectPath, circlePath, svgDocument } from "./svg";
import type { LogoInput, SvgParts } from "./svg";
import { fitTextSize, layoutText, textPathData } from "./text";
import { resolvePalette } from "./themes";
import type { JoyPalette, JoyThemeInput } from "./themes";

export type ModuleStyle = "rounded" | "dots" | "square";
export type EyeStyle = "rounded" | "circle" | "square";
export type JoyCodeLogo = LogoInput;

export const MODULE = 10;
export const MAX_LOGO_AREA_RATIO = 0.18;
export const DEFAULT_LOGO_SCALE = 0.28;
export const DEFAULT_QUIET_ZONE = 4;
export const MIN_QUIET_ZONE = 4;

export interface JoyCodeStyle {
  theme?: JoyThemeInput;
  gradient?: boolean;
  moduleStyle?: ModuleStyle;
  eyeStyle?: EyeStyle;
  logo?: JoyCodeLogo;
  logoScale?: number;
  quietZone?: number;
  idPrefix?: string;
}

export interface JoyCodeOptions extends JoyCodeStyle {
  frame?: boolean;
  headline?: string | false;
  footer?: string | false;
  locale?: JoyLocale;
  title?: string;
}

export interface LogoCutout {
  modules: number;
  start: number;
  areaRatio: number;
}

export interface CodeArtwork extends SvgParts {
  width: number;
  height: number;
  panelX: number;
  panelY: number;
  panelSize: number;
  cutout: LogoCutout | null;
  missingGlyphs: string[];
}

function largestOddAtMost(value: number): number {
  const floor = Math.floor(value);
  return floor % 2 === 0 ? floor - 1 : floor;
}

export function logoCutout(size: number, scale: number = DEFAULT_LOGO_SCALE): LogoCutout | null {
  const ratioLimit = largestOddAtMost(size * Math.sqrt(MAX_LOGO_AREA_RATIO));
  const finderLimit = largestOddAtMost(size - 18);
  const limit = Math.min(ratioLimit, finderLimit);
  if (limit < 3) return null;
  const requested = largestOddAtMost(size * clamp(scale, 0.05, 1));
  const modules = clamp(requested, 3, limit);
  return {
    modules,
    start: (size - modules) / 2,
    areaRatio: (modules * modules) / (size * size),
  };
}

function inFinder(row: number, column: number, size: number): boolean {
  const top = row < 7;
  const bottom = row >= size - 7;
  const left = column < 7;
  const right = column >= size - 7;
  return (top && left) || (top && right) || (bottom && left);
}

function moduleCells(matrix: QrMatrix, cutout: LogoCutout | null): boolean[][] {
  const size = matrix.length;
  return matrix.map((line, row) =>
    line.map((dark, column) => {
      if (!dark || inFinder(row, column, size)) return false;
      if (cutout) {
        const end = cutout.start + cutout.modules;
        const inside = row >= cutout.start && row < end && column >= cutout.start && column < end;
        if (inside) return false;
      }
      return true;
    }),
  );
}

function modulesPath(cells: boolean[][], style: ModuleStyle, origin: number): string {
  const size = cells.length;
  const at = (row: number, column: number): boolean => cells[row]?.[column] === true;
  const parts: string[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (!at(row, column)) continue;
      const x = origin + column * MODULE;
      const y = origin + row * MODULE;
      if (style === "dots") {
        parts.push(circlePath(x + MODULE / 2, y + MODULE / 2, MODULE / 2));
        continue;
      }
      if (style === "square") {
        parts.push(`M${num(x)} ${num(y)}h${MODULE}v${MODULE}h${-MODULE}Z`);
        continue;
      }
      const up = at(row - 1, column);
      const down = at(row + 1, column);
      const left = at(row, column - 1);
      const right = at(row, column + 1);
      const radius = MODULE * 0.46;
      const tl = !up && !left ? radius : 0;
      const tr = !up && !right ? radius : 0;
      const br = !down && !right ? radius : 0;
      const bl = !down && !left ? radius : 0;
      const arc = (r: number, dx: number, dy: number): string =>
        r > 0 ? `A${num(r)} ${num(r)} 0 0 1 ${num(dx)} ${num(dy)}` : `L${num(dx)} ${num(dy)}`;
      parts.push(
        `M${num(x + tl)} ${num(y)}` +
          `H${num(x + MODULE - tr)}${arc(tr, x + MODULE, y + tr)}` +
          `V${num(y + MODULE - br)}${arc(br, x + MODULE - br, y + MODULE)}` +
          `H${num(x + bl)}${arc(bl, x, y + MODULE - bl)}` +
          `V${num(y + tl)}${arc(tl, x + tl, y)}Z`,
      );
    }
  }
  return parts.join("");
}

interface EyePaths {
  ring: string;
  core: string;
}

function eyePaths(x: number, y: number, style: EyeStyle): EyePaths {
  const m = MODULE;
  if (style === "circle") {
    const cx = x + 3.5 * m;
    const cy = y + 3.5 * m;
    return {
      ring: circlePath(cx, cy, 3.5 * m) + circlePath(cx, cy, 2.5 * m),
      core: circlePath(cx, cy, 1.5 * m),
    };
  }
  const outerRadius = style === "square" ? 0 : 2.2 * m;
  const holeRadius = style === "square" ? 0 : 1.25 * m;
  const coreRadius = style === "square" ? 0 : 0.95 * m;
  return {
    ring:
      roundedRectPath(x, y, 7 * m, 7 * m, outerRadius) +
      roundedRectPath(x + m, y + m, 5 * m, 5 * m, holeRadius),
    core: roundedRectPath(x + 2 * m, y + 2 * m, 3 * m, 3 * m, coreRadius),
  };
}

function gradientDefs(id: string, from: string, to: string, x2: number, y2: number): string {
  return `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${num(x2)}" y2="${num(y2)}"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient>`;
}

export interface CodePanel extends SvgParts {
  size: number;
  cutout: LogoCutout | null;
  palette: JoyPalette;
}

export function buildCodePanel(matrix: QrMatrix, style: JoyCodeStyle = {}): CodePanel {
  const size = assertMatrix(matrix);
  const prefix = style.idPrefix ?? "jc";
  const palette = resolvePalette(style.theme);
  const quiet = Math.max(MIN_QUIET_ZONE, style.quietZone ?? DEFAULT_QUIET_ZONE);
  const origin = quiet * MODULE;
  const panelSize = (size + 2 * quiet) * MODULE;
  const cutout = style.logo ? logoCutout(size, style.logoScale) : null;
  const useGradient = style.gradient ?? palette.gradient;
  const moduleFill = useGradient ? `url(#${prefix}-mod)` : palette.modules;
  const eyeFill = useGradient ? `url(#${prefix}-eye)` : palette.eye;
  const cells = moduleCells(matrix, cutout);
  const modules = modulesPath(cells, style.moduleStyle ?? "rounded", origin);
  const eyeStyle = style.eyeStyle ?? "rounded";
  const far = origin + (size - 7) * MODULE;
  const eyes = [
    eyePaths(origin, origin, eyeStyle),
    eyePaths(far, origin, eyeStyle),
    eyePaths(origin, far, eyeStyle),
  ];
  const defs: string[] = [];
  if (useGradient) {
    defs.push(
      gradientDefs(`${prefix}-mod`, palette.modules, palette.modulesEnd, panelSize, panelSize),
    );
    defs.push(gradientDefs(`${prefix}-eye`, palette.eye, palette.modules, panelSize, panelSize));
  }
  const body: string[] = [
    `<path fill="${palette.panel}" d="${roundedRectPath(0, 0, panelSize, panelSize, MODULE * 2.6)}"/>`,
    `<path fill="${moduleFill}" d="${modules}"/>`,
    `<path fill="${eyeFill}" fill-rule="evenodd" d="${eyes.map((eye) => eye.ring).join("")}"/>`,
    `<path fill="${palette.eyeCore}" d="${eyes.map((eye) => eye.core).join("")}"/>`,
  ];
  if (style.logo && cutout) {
    const prepared = prepareLogo(style.logo, `${prefix}-logo`);
    const plate = cutout.modules * MODULE;
    const plateX = origin + cutout.start * MODULE;
    const inner = plate * 0.72;
    const scale = Math.min(inner / prepared.width, inner / prepared.height);
    const offsetX = plateX + (plate - prepared.width * scale) / 2 - prepared.minX * scale;
    const offsetY = plateX + (plate - prepared.height * scale) / 2 - prepared.minY * scale;
    body.push(
      `<path fill="${palette.panel}" d="${roundedRectPath(plateX, plateX, plate, plate, plate * 0.26)}"/>`,
      `<g transform="translate(${num(offsetX)} ${num(offsetY)}) scale(${num(scale)})">${prepared.content}</g>`,
    );
  }
  return { size: panelSize, cutout, palette, defs: defs.join(""), body: body.join("") };
}

export function buildFramedCode(matrix: QrMatrix, options: JoyCodeOptions = {}): CodeArtwork {
  const panel = buildCodePanel(matrix, options);
  const prefix = options.idPrefix ?? "jc";
  const headline = options.frame === false ? "" : resolveHeadline(options.headline, options.locale);
  const footer = options.frame === false || options.footer === false ? "" : (options.footer ?? "");
  const missingGlyphs: string[] = [];
  if (options.frame === false) {
    return {
      width: panel.size,
      height: panel.size,
      panelX: 0,
      panelY: 0,
      panelSize: panel.size,
      cutout: panel.cutout,
      missingGlyphs,
      defs: panel.defs,
      body: panel.body,
    };
  }
  const palette = panel.palette;
  const size = panel.size;
  const pad = size * 0.075;
  const headlineBlock = headline ? size * 0.17 : size * 0.02;
  const footerBlock = footer ? size * 0.2 : size * 0.02;
  const width = size + pad * 2;
  const height = pad + headlineBlock + size + footerBlock + pad;
  const radius = width * 0.085;
  const defs: string[] = [
    panel.defs,
    `<linearGradient id="${prefix}-card" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${num(width * 0.4)}" y2="${num(height)}"><stop offset="0" stop-color="${palette.canvasAlt}"/><stop offset="0.55" stop-color="${palette.canvas}"/><stop offset="1" stop-color="${palette.canvas}"/></linearGradient>`,
    gradientDefs(`${prefix}-accent`, palette.accent, palette.accentEnd, width, 0),
  ];
  const body: string[] = [
    `<path fill="url(#${prefix}-card)" d="${roundedRectPath(0, 0, width, height, radius)}"/>`,
    `<path fill="none" stroke="url(#${prefix}-accent)" stroke-width="${num(width * 0.012)}" d="${roundedRectPath(width * 0.006, width * 0.006, width - width * 0.012, height - width * 0.012, radius)}"/>`,
  ];
  const panelX = pad;
  const panelY = pad + headlineBlock;
  body.push(
    `<path fill="none" stroke="url(#${prefix}-accent)" stroke-width="${num(size * 0.006)}" d="${roundedRectPath(panelX - size * 0.018, panelY - size * 0.018, size * 1.036, size * 1.036, MODULE * 3)}"/>`,
    `<g transform="translate(${num(panelX)} ${num(panelY)})">${panel.body}</g>`,
  );
  if (headline) {
    const base = { family: "unbounded", weight: 700, size: size * 0.072, tracking: 0.02 } as const;
    const fitted = fitTextSize(headline, base, width - pad * 2.4, size * 0.03);
    const layout = layoutText(headline, { ...base, size: fitted });
    missingGlyphs.push(...layout.missing);
    const baseline = pad + headlineBlock / 2 + layout.capHeight / 2 - size * 0.01;
    body.push(
      `<path fill="url(#${prefix}-accent)" d="${textPathData(layout, width / 2, baseline, "middle")}"/>`,
    );
  }
  if (footer) {
    const base = { family: "unbounded", weight: 700, size: size * 0.076, tracking: 0.04 } as const;
    const fitted = fitTextSize(footer, base, width - pad * 2.4, size * 0.03);
    const layout = layoutText(footer, { ...base, size: fitted });
    missingGlyphs.push(...layout.missing);
    const baseline = panelY + size + footerBlock / 2 + layout.capHeight / 2 + size * 0.012;
    body.push(
      `<path fill="${palette.text}" d="${textPathData(layout, width / 2, baseline, "middle")}"/>`,
    );
  }
  return {
    width,
    height,
    panelX,
    panelY,
    panelSize: size,
    cutout: panel.cutout,
    missingGlyphs,
    defs: defs.join(""),
    body: body.join(""),
  };
}

export function renderJoyCode(matrix: QrMatrix, options: JoyCodeOptions = {}): string {
  const art = buildFramedCode(matrix, options);
  return svgDocument({
    width: num(art.width),
    height: num(art.height),
    viewBox: `0 0 ${num(art.width)} ${num(art.height)}`,
    title: options.title ?? "Joy Code",
    parts: { defs: art.defs, body: art.body },
  });
}
