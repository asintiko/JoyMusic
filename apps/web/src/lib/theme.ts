import { venueThemeSchema, type VenueTheme } from "@joymusic/shared";

export const themeCanvas: Record<VenueTheme, string> = {
  club: "#0A0812",
  lounge: "#0B0907",
  cafe: "#FBF6EE",
};

export const themeBrand: Record<VenueTheme, string> = {
  club: "#A996FF",
  lounge: "#E4C078",
  cafe: "#A64614",
};

export function parseTheme(value: string | null | undefined, fallback: VenueTheme): VenueTheme {
  const parsed = venueThemeSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}
