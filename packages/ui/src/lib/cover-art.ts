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

export const coverPalettes: readonly CoverColors[] = [
  {
    backgroundFrom: "#0c0820",
    backgroundTo: "#1c1250",
    primary: "#7a5cff",
    secondary: "#ff4fd8",
    accent: "#ffd1f5",
  },
  {
    backgroundFrom: "#1a0805",
    backgroundTo: "#3a1208",
    primary: "#ff5a36",
    secondary: "#ffb020",
    accent: "#fff0c2",
  },
  {
    backgroundFrom: "#041418",
    backgroundTo: "#0a2c36",
    primary: "#19c3c3",
    secondary: "#3b82f6",
    accent: "#c8fff4",
  },
  {
    backgroundFrom: "#1c0714",
    backgroundTo: "#3a0f2c",
    primary: "#ff4d8d",
    secondary: "#b14dff",
    accent: "#ffe0ec",
  },
  {
    backgroundFrom: "#0d0a1e",
    backgroundTo: "#1b1440",
    primary: "#6a4cff",
    secondary: "#2dd4bf",
    accent: "#b6ff3b",
  },
  {
    backgroundFrom: "#150e04",
    backgroundTo: "#2e1e08",
    primary: "#f0b44c",
    secondary: "#d9643a",
    accent: "#fff3d0",
  },
  {
    backgroundFrom: "#050b1f",
    backgroundTo: "#0c1a4a",
    primary: "#3d6bff",
    secondary: "#7ad7ff",
    accent: "#ffffff",
  },
  {
    backgroundFrom: "#14071f",
    backgroundTo: "#2a0e42",
    primary: "#c04dff",
    secondary: "#ff7ab8",
    accent: "#ffe6a8",
  },
  {
    backgroundFrom: "#1b0620",
    backgroundTo: "#3b0f3a",
    primary: "#ff3d7f",
    secondary: "#ff9a3d",
    accent: "#ffe9b8",
  },
  {
    backgroundFrom: "#04140f",
    backgroundTo: "#0a2e24",
    primary: "#1fd39a",
    secondary: "#3da5ff",
    accent: "#d6ffe9",
  },
  {
    backgroundFrom: "#170508",
    backgroundTo: "#38101a",
    primary: "#ff3b4e",
    secondary: "#ff8a5c",
    accent: "#ffd9c9",
  },
  {
    backgroundFrom: "#0a1020",
    backgroundTo: "#152246",
    primary: "#8fb6ff",
    secondary: "#c9a8ff",
    accent: "#ffffff",
  },
];

export function coverSpec(seed: string): CoverSpec {
  const normalized = seed.normalize("NFC").trim().toLowerCase();
  const random = createRandom(`cover:${normalized}`);
  const hue = hashString(normalized) % 360;
  const palette = pickFrom(random, coverPalettes);
  const pattern = pickFrom(random, coverPatterns);
  return {
    seed: normalized,
    pattern,
    hue,
    angle: Math.round(rangeFrom(random, 0, 360)),
    monogram: random() > 0.45,
    colors: { ...palette },
  };
}

export function coverPalette(seed: string): string[] {
  const { colors } = coverSpec(seed);
  return [colors.primary, colors.secondary, colors.backgroundTo];
}
