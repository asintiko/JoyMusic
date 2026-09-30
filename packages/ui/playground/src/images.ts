import backdropCafe from "@joymusic/brand/assets/generated/web/backdrop-cafe-2560.webp";
import backdropCafePlaceholder from "@joymusic/brand/assets/generated/web/backdrop-cafe-placeholder.webp";
import backdropLounge from "@joymusic/brand/assets/generated/web/backdrop-lounge-2560.webp";
import backdropLoungePlaceholder from "@joymusic/brand/assets/generated/web/backdrop-lounge-placeholder.webp";
import heroLanding from "@joymusic/brand/assets/generated/web/hero-landing-1280.webp";
import heroLanding2560 from "@joymusic/brand/assets/generated/web/hero-landing-2560.webp";
import heroLandingPlaceholder from "@joymusic/brand/assets/generated/web/hero-landing-placeholder.webp";
import phoneTable from "@joymusic/brand/assets/generated/web/hero-phone-table-720.webp";
import phoneTablePlaceholder from "@joymusic/brand/assets/generated/web/hero-phone-table-placeholder.webp";
import type { ThemeId } from "../../src";

export const images = {
  heroLanding,
  heroLanding2560,
  heroLandingPlaceholder,
  backdropLounge,
  backdropLoungePlaceholder,
  backdropCafe,
  backdropCafePlaceholder,
  phoneTable,
  phoneTablePlaceholder,
};

export function backdropFor(theme: ThemeId): string {
  if (theme === "lounge") return backdropLounge;
  if (theme === "cafe") return backdropCafe;
  return heroLanding2560;
}
