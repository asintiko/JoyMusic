import { escapeXml, num } from "./format";

export interface SvgParts {
  defs: string;
  body: string;
}

export interface SvgDocumentOptions {
  width: number | string;
  height: number | string;
  viewBox: string;
  title?: string;
  parts: SvgParts;
}

export function svgDocument(options: SvgDocumentOptions): string {
  const title = options.title ? `<title>${escapeXml(options.title)}</title>` : "";
  const defs = options.parts.defs ? `<defs>${options.parts.defs}</defs>` : "";
  const label = options.title ? ` role="img" aria-label="${escapeXml(options.title)}"` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${options.width}" height="${options.height}" viewBox="${options.viewBox}"${label}>${title}${defs}${options.parts.body}</svg>`;
}

export function roundedRectPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r === 0) return `M${num(x)} ${num(y)}h${num(width)}v${num(height)}h${num(-width)}Z`;
  const right = x + width;
  const bottom = y + height;
  return (
    `M${num(x + r)} ${num(y)}H${num(right - r)}A${num(r)} ${num(r)} 0 0 1 ${num(right)} ${num(y + r)}` +
    `V${num(bottom - r)}A${num(r)} ${num(r)} 0 0 1 ${num(right - r)} ${num(bottom)}` +
    `H${num(x + r)}A${num(r)} ${num(r)} 0 0 1 ${num(x)} ${num(bottom - r)}` +
    `V${num(y + r)}A${num(r)} ${num(r)} 0 0 1 ${num(x + r)} ${num(y)}Z`
  );
}

export function circlePath(cx: number, cy: number, r: number): string {
  return `M${num(cx - r)} ${num(cy)}a${num(r)} ${num(r)} 0 1 0 ${num(2 * r)} 0a${num(r)} ${num(r)} 0 1 0 ${num(-2 * r)} 0Z`;
}

export interface LogoInput {
  svg: string;
  viewBox?: string;
}

export interface PreparedLogo {
  content: string;
  minX: number;
  minY: number;
  width: number;
  height: number;
}

function parseViewBox(value: string): [number, number, number, number] {
  const parts = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  const valid = parts.length === 4 && parts.every((part) => Number.isFinite(part));
  if (!valid || parts[2]! <= 0 || parts[3]! <= 0) throw new Error(`Invalid logo viewBox: ${value}`);
  return [parts[0]!, parts[1]!, parts[2]!, parts[3]!];
}

function namespaceIds(markup: string, prefix: string): string {
  const ids = new Set<string>();
  for (const match of markup.matchAll(/\sid="([^"]+)"/g)) ids.add(match[1]!);
  let result = markup;
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result
      .replace(new RegExp(`(\\sid=")${escaped}(")`, "g"), `$1${prefix}-${id}$2`)
      .replace(new RegExp(`url\\(#${escaped}\\)`, "g"), `url(#${prefix}-${id})`)
      .replace(new RegExp(`(href=")#${escaped}(")`, "g"), `$1#${prefix}-${id}$2`);
  }
  return result;
}

export function prepareLogo(logo: LogoInput, idPrefix: string): PreparedLogo {
  let markup = logo.svg.replace(/<\?xml[^>]*\?>/g, "").trim();
  let viewBox = logo.viewBox;
  const root = markup.match(/^<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/i);
  if (root) {
    const attributes = root[1] ?? "";
    if (!viewBox) viewBox = attributes.match(/viewBox="([^"]+)"/i)?.[1];
    markup = root[2] ?? "";
  }
  if (!viewBox) throw new Error("Logo needs a viewBox");
  markup = markup.replace(/<title>[\s\S]*?<\/title>/gi, "");
  const [minX, minY, width, height] = parseViewBox(viewBox);
  return { content: namespaceIds(markup, idPrefix), minX, minY, width, height };
}
