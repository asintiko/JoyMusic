import type { Font, Glyph, PathCommand } from "opentype.js";
import { loadFallbackChains, loadFontChain } from "./fonts";
import type { FontFamily, FontWeight } from "./fonts";
import { num } from "./format";

export interface TextStyle {
  family: FontFamily;
  weight: FontWeight;
  size: number;
  tracking?: number;
}

export interface GlyphShape {
  commands: PathCommand[];
  x: number;
  advance: number;
}

export interface TextLayout {
  glyphs: GlyphShape[];
  width: number;
  size: number;
  capHeight: number;
  missing: string[];
}

export type TextAnchor = "start" | "middle" | "end";

const substitutes: Record<string, string[]> = {
  ʻ: ["‘", "ʼ", "'"],
  ʼ: ["’", "'"],
  "‘": ["ʻ", "'"],
  "’": ["ʼ", "'"],
  "`": ["‘", "'"],
  "´": ["’", "'"],
  қ: ["к"],
  Қ: ["К"],
  ғ: ["г"],
  Ғ: ["Г"],
  ҳ: ["х"],
  Ҳ: ["Х"],
  "·": ["•", "."],
  "•": ["·", "."],
  "–": ["-"],
  "—": ["-"],
  " ": [" "],
};

interface Resolved {
  font: Font;
  glyph: Glyph;
}

function findIn(chain: Font[], character: string): Resolved | null {
  for (const font of chain) {
    if (font.charToGlyphIndex(character) > 0) return { font, glyph: font.charToGlyph(character) };
  }
  return null;
}

function candidates(character: string): string[] {
  const base = character.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const list = [character, ...(substitutes[character] ?? [])];
  if (base !== character) list.push(base);
  return list;
}

function resolveCharacter(character: string, chains: Font[][]): Resolved | null {
  const options = candidates(character);
  for (const option of options) {
    for (const chain of chains) {
      const found = findIn(chain, option);
      if (found) return found;
    }
  }
  return null;
}

function scaleCommands(commands: PathCommand[], scale: number): PathCommand[] {
  return commands.map((command) => {
    const next: PathCommand = { type: command.type };
    if (command.x !== undefined) next.x = command.x * scale;
    if (command.y !== undefined) next.y = -command.y * scale;
    if (command.x1 !== undefined) next.x1 = command.x1 * scale;
    if (command.y1 !== undefined) next.y1 = -command.y1 * scale;
    if (command.x2 !== undefined) next.x2 = command.x2 * scale;
    if (command.y2 !== undefined) next.y2 = -command.y2 * scale;
    return next;
  });
}

function capHeightOf(chain: Font[], size: number): number {
  const resolved = findIn(chain, "H");
  if (!resolved) return size * 0.7;
  const scale = size / resolved.font.unitsPerEm;
  let top = 0;
  for (const command of resolved.glyph.path.commands) {
    if (command.y !== undefined) top = Math.max(top, command.y);
  }
  return top * scale;
}

export function layoutText(text: string, style: TextStyle): TextLayout {
  const own = loadFontChain(style.family, style.weight);
  const chains = [own, ...loadFallbackChains(style.family)];
  const tracking = (style.tracking ?? 0) * style.size;
  const glyphs: GlyphShape[] = [];
  const missing: string[] = [];
  let pen = 0;
  let previous: Resolved | null = null;
  const characters = Array.from(text);
  for (const [index, character] of characters.entries()) {
    const resolved = resolveCharacter(character, chains) ?? resolveCharacter(" ", chains);
    if (!resolved) continue;
    const exact = resolved.font.charToGlyphIndex(character) > 0;
    if (!exact && !missing.includes(character)) missing.push(character);
    const scale = style.size / resolved.font.unitsPerEm;
    if (previous && previous.font === resolved.font) {
      try {
        pen += resolved.font.getKerningValue(previous.glyph, resolved.glyph) * scale;
      } catch {
        pen += 0;
      }
    }
    const advance = (resolved.glyph.advanceWidth ?? 0) * scale;
    const hasOutline = resolved.glyph.path.commands.length > 0;
    glyphs.push({
      commands: hasOutline ? scaleCommands(resolved.glyph.path.commands, scale) : [],
      x: pen,
      advance,
    });
    pen += advance + (index < characters.length - 1 ? tracking : 0);
    previous = resolved;
  }
  return { glyphs, width: pen, size: style.size, capHeight: capHeightOf(own, style.size), missing };
}

export function fitTextSize(text: string, style: TextStyle, maxWidth: number, minSize = 0): number {
  const measured = layoutText(text, style).width;
  if (measured <= maxWidth) return style.size;
  return Math.max(minSize, (style.size * maxWidth) / measured);
}

type Transform = (x: number, y: number) => [number, number];

function commandsToPath(commands: PathCommand[], transform: Transform): string {
  const parts: string[] = [];
  const point = (x: number, y: number): string => {
    const [tx, ty] = transform(x, y);
    return `${num(tx)} ${num(ty)}`;
  };
  for (const command of commands) {
    if (command.type === "M") parts.push(`M${point(command.x ?? 0, command.y ?? 0)}`);
    else if (command.type === "L") parts.push(`L${point(command.x ?? 0, command.y ?? 0)}`);
    else if (command.type === "Q") {
      parts.push(
        `Q${point(command.x1 ?? 0, command.y1 ?? 0)} ${point(command.x ?? 0, command.y ?? 0)}`,
      );
    } else if (command.type === "C") {
      parts.push(
        `C${point(command.x1 ?? 0, command.y1 ?? 0)} ${point(command.x2 ?? 0, command.y2 ?? 0)} ${point(command.x ?? 0, command.y ?? 0)}`,
      );
    } else parts.push("Z");
  }
  return parts.join("");
}

export function textPathData(
  layout: TextLayout,
  x: number,
  baseline: number,
  anchor: TextAnchor = "start",
): string {
  const origin =
    anchor === "middle" ? x - layout.width / 2 : anchor === "end" ? x - layout.width : x;
  return layout.glyphs
    .map((glyph) =>
      commandsToPath(glyph.commands, (px, py) => [origin + glyph.x + px, baseline + py]),
    )
    .join("");
}

export function arcTextPathData(
  layout: TextLayout,
  centerX: number,
  centerY: number,
  radius: number,
  side: "top" | "bottom",
): string {
  const half = layout.width / 2;
  return layout.glyphs
    .map((glyph) => {
      const middle = glyph.x + glyph.advance / 2;
      const phi =
        side === "top"
          ? -Math.PI / 2 + (middle - half) / radius
          : Math.PI / 2 + (half - middle) / radius;
      const rotation = side === "top" ? phi + Math.PI / 2 : phi - Math.PI / 2;
      const cos = Math.cos(rotation);
      const sin = Math.sin(rotation);
      const originX = centerX + radius * Math.cos(phi);
      const originY = centerY + radius * Math.sin(phi);
      const localOffset = -glyph.advance / 2;
      return commandsToPath(glyph.commands, (px, py) => {
        const lx = px + localOffset;
        return [originX + lx * cos - py * sin, originY + lx * sin + py * cos];
      });
    })
    .join("");
}
