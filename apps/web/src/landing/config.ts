const trimSlash = (value: string): string => value.replace(/\/+$/, "");

export const defaultAdminUrl = "http://localhost:5173";
export const defaultContactUrl = "mailto:hello@joymusic.uz";
export const defaultDownloadUrl = "https://github.com/asintiko/JoyMusic/releases";
export const defaultSiteOrigin = "http://localhost:3000";
export const demoVenueSlug = "joy-demo-club";

export interface LandingConfig {
  adminUrl: string;
  contactUrl: string;
  downloadUrl: string;
  downloadReady: boolean;
  siteOrigin: string;
  demoUrl: string;
}

export function buildLandingConfig(env: Record<string, string | undefined>): LandingConfig {
  const download = env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL?.trim() ?? "";
  const siteOrigin = trimSlash(env.NEXT_PUBLIC_SITE_URL?.trim() || defaultSiteOrigin);
  return {
    adminUrl: env.NEXT_PUBLIC_ADMIN_URL?.trim() || defaultAdminUrl,
    contactUrl: env.NEXT_PUBLIC_CONTACT_URL?.trim() || defaultContactUrl,
    downloadUrl: download || defaultDownloadUrl,
    downloadReady: download.length > 0,
    siteOrigin,
    demoUrl: `${siteOrigin}/v/${demoVenueSlug}`,
  };
}

export const landingConfig: LandingConfig = buildLandingConfig({
  NEXT_PUBLIC_ADMIN_URL: process.env.NEXT_PUBLIC_ADMIN_URL,
  NEXT_PUBLIC_CONTACT_URL: process.env.NEXT_PUBLIC_CONTACT_URL,
  NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL: process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
