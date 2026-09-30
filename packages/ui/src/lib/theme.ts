import type { VenueTheme } from "@joymusic/shared";

export const themeIds = ["club", "lounge", "cafe"] as const satisfies readonly VenueTheme[];

export type ThemeId = (typeof themeIds)[number];

export const defaultThemeId: ThemeId = "club";

export const themeMeta: Record<
  ThemeId,
  { canvas: string; brand: string; scheme: "dark" | "light"; label: string }
> = {
  club: { canvas: "#0A0812", brand: "#A996FF", scheme: "dark", label: "Club" },
  lounge: { canvas: "#0B0907", brand: "#E4C078", scheme: "dark", label: "Lounge" },
  cafe: { canvas: "#FBF6EE", brand: "#A64614", scheme: "light", label: "Café" },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (themeIds as readonly string[]).includes(value);
}

export function applyTheme(theme: ThemeId, target?: HTMLElement): void {
  const element = target ?? (typeof document === "undefined" ? undefined : document.documentElement);
  if (!element) return;
  element.setAttribute("data-theme", theme);
  if (!target && typeof document !== "undefined") {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = themeMeta[theme].canvas;
  }
}
