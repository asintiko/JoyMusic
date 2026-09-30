import { createRandom, hashString, pickFrom, rangeFrom } from "./hash";

export const coverPatterns = [
  "orbs",
  "rings",
  "bars",
  "sunrise",
  "waves",
  "halftone",
  "arcs",
  "ikat",
] as const;

export type CoverPattern = (typeof coverPatterns)[number];

export interface CoverColors {
  backgroundFrom: string;
  backgroundTo: string;
  primary: string;
  secondary: string;
  accent: string;
}

export interface CoverSpec {
  seed: string;
  pattern: CoverPattern;
  hue: number;
  angle: number;
  monogram: boolean;
  colors: CoverColors;
}

const harmonies = [
  { secondary: 34, accent: 78 },
  { secondary: 150, accent: 210 },
  { secondary: 120, accent: 240 },
  { secondary: 180, accent: 28 },
  { secondary: 60, accent: 300 },
  { secondary: -40, accent: 40 },
] as const;

function wrapHue(value: number): number {
  return ((value % 360) + 360) % 360;
}

function hsl(hue: number, saturation: number, lightness: number): string {
  return `hsl(${Math.round(wrapHue(hue))} ${saturation}% ${lightness}%)`;
}

export function coverSpec(seed: string): CoverSpec {
  const normalized = seed.normalize("NFC").trim().toLowerCase();
  const random = createRandom(`cover:${normalized}`);
  const hue = hashString(normalized) % 360;
  const harmony = pickFrom(random, harmonies);
  const pattern = pickFrom(random, coverPatterns);
  return {
    seed: normalized,
    pattern,
    hue,
    angle: Math.round(rangeFrom(random, 0, 360)),
    monogram: random() > 0.45,
    colors: {
      backgroundFrom: hsl(hue, 62, 9),
      backgroundTo: hsl(hue + 24, 58, 19),
      primary: hsl(hue, 88, 58),
      secondary: hsl(hue + harmony.secondary, 92, 62),
      accent: hsl(hue + harmony.accent, 96, 72),
    },
  };
}

export function coverPalette(seed: string): string[] {
  const { colors } = coverSpec(seed);
  return [colors.primary, colors.secondary, colors.accent];
}
