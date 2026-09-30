import { pickLocale, type Locale } from "@joymusic/shared";

export const localeList = ["uz", "ru", "en"] as const satisfies readonly Locale[];

export const localeCookieName = "jm-locale";
export const localeStorageKey = "jm:locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === "string" && (localeList as readonly string[]).includes(value);
}

export function parseAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const ranked = header
    .split(",")
    .map((part, index) => {
      const [tag = "", ...params] = part.trim().split(";");
      const quality = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="))
        ?.slice(2);
      return { tag: tag.trim(), q: quality === undefined ? 1 : Number(quality), index };
    })
    .filter((entry) => entry.tag && Number.isFinite(entry.q) && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  for (const entry of ranked) {
    const base = entry.tag.toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return null;
}

export interface LocaleInputs {
  override?: string | null;
  cookie?: string | null;
  acceptLanguage?: string | null;
  venueDefault: Locale;
  preferNavigator?: boolean;
}

export function resolveLocale(inputs: LocaleInputs): Locale {
  if (isLocale(inputs.override)) return inputs.override;
  if (isLocale(inputs.cookie)) return inputs.cookie;
  if (inputs.preferNavigator !== false) {
    const fromHeader = parseAcceptLanguage(inputs.acceptLanguage);
    if (fromHeader) return fromHeader;
  }
  return pickLocale(null, inputs.venueDefault);
}

export function persistLocale(locale: Locale): void {
  if (typeof document === "undefined") return;
  document.cookie = `${localeCookieName}=${locale}; path=/; max-age=31536000; samesite=lax`;
  try {
    window.localStorage.setItem(localeStorageKey, locale);
  } catch {
    return;
  }
}
