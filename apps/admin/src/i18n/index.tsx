import { locales, pickLocale, type Locale } from "@joymusic/shared";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { browserStorage, readValue, writeValue } from "../lib/storage";
import type { MessageKey } from "./messages";
import { translate, type Params, type Translate } from "./translate";

export const localeStorageKey = "joymusic.admin.locale";
export const adminDefaultLocale: Locale = "ru";

export function detectLocale(): Locale {
  const stored = readValue(browserStorage(), localeStorageKey);
  if (stored && (locales as readonly string[]).includes(stored)) return stored as Locale;
  return adminDefaultLocale;
}

export function browserLocale(): Locale {
  if (typeof navigator === "undefined") return adminDefaultLocale;
  return pickLocale(navigator.language, adminDefaultLocale);
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale ?? detectLocale());

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    writeValue(browserStorage(), localeStorageKey, next);
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: (key: MessageKey, params?: Params) => translate(locale, key, params),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("I18nProvider is missing");
  return value;
}

export function useT(): Translate {
  return useI18n().t;
}

export type { MessageKey } from "./messages";
