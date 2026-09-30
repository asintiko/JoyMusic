export type JoyThemeName = "club" | "lounge" | "cafe";

export interface JoyPalette {
  canvas: string;
  canvasAlt: string;
  panel: string;
  modules: string;
  modulesEnd: string;
  eye: string;
  eyeCore: string;
  accent: string;
  accentEnd: string;
  text: string;
  textMuted: string;
  gradient: boolean;
}

export type JoyThemeCustom = Partial<JoyPalette> & { base?: JoyThemeName };
export type JoyThemeInput = JoyThemeName | JoyThemeCustom;

export const joyThemes: Record<JoyThemeName, JoyPalette> = {
  club: {
    canvas: "#0A0812",
    canvasAlt: "#1D1046",
    panel: "#F5F2FF",
    modules: "#3A1FB5",
    modulesEnd: "#9B1A8E",
    eye: "#24127A",
    eyeCore: "#B0159A",
    accent: "#7A5CFF",
    accentEnd: "#FF4FD8",
    text: "#F5F2FF",
    textMuted: "#B8B0D9",
    gradient: true,
  },
  lounge: {
    canvas: "#0C0B09",
    canvasAlt: "#211B10",
    panel: "#F6EFDD",
    modules: "#1A150C",
    modulesEnd: "#5C4210",
    eye: "#14100A",
    eyeCore: "#8A6414",
    accent: "#C9A24B",
    accentEnd: "#F3D98B",
    text: "#F6EFDD",
    textMuted: "#B9AD8F",
    gradient: true,
  },
  cafe: {
    canvas: "#F3E7D8",
    canvasAlt: "#E6D0B6",
    panel: "#FFFBF4",
    modules: "#3B2A20",
    modulesEnd: "#6B4430",
    eye: "#2E1F17",
    eyeCore: "#9E5730",
    accent: "#9C5427",
    accentEnd: "#C8813F",
    text: "#3B2A20",
    textMuted: "#7B6656",
    gradient: true,
  },
};

export function resolvePalette(theme: JoyThemeInput = "club"): JoyPalette {
  if (typeof theme === "string") return { ...joyThemes[theme] };
  const { base, ...overrides } = theme;
  const merged: JoyPalette = { ...joyThemes[base ?? "club"] };
  for (const [key, value] of Object.entries(overrides)) {
    if (value !== undefined) (merged as unknown as Record<string, unknown>)[key] = value;
  }
  return merged;
}

export function relativeLuminance(hex: string): number {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : value;
  const channels = [0, 2, 4].map((offset) => {
    const channel = Number.parseInt(full.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0]! + 0.7152 * channels[1]! + 0.0722 * channels[2]!;
}

export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export const minimumModuleContrast = 4.5;
