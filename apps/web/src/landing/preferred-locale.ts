import type { Locale } from "@joymusic/shared";
import { isLocale, localeCookieName } from "@/lib/locale";
import { defaultLandingLocale, landingPath } from "./seo";

export function preferredLocaleFromCookie(cookie: string): Locale | null {
  for (const part of cookie.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === localeCookieName && isLocale(value)) return value;
  }
  return null;
}

export function redirectPathForPreference(cookie: string, current: Locale): string | null {
  const preferred = preferredLocaleFromCookie(cookie);
  if (preferred === null || preferred === current) return null;
  return landingPath(preferred);
}

export function redirectToPreferredLocale(
  cookie: string = document.cookie,
  location: Pick<Location, "replace" | "hash"> = window.location,
): void {
  try {
    const match = /(?:^|;\s*)jm-locale=(uz|ru|en)/.exec(cookie);
    const preferred = match?.[1];
    if (preferred && preferred !== "uz") location.replace(`/${preferred}${location.hash}`);
  } catch {
    return;
  }
}

export const preferredLocaleScript = `(${redirectToPreferredLocale.toString()})()`;

export const preferredLocaleApplies = (locale: Locale): boolean => locale === defaultLandingLocale;
