import { createContext, useContext, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import type { Locale } from "@joymusic/shared";
import { strings } from "./strings";
import type { Strings } from "./strings";

interface LocaleContextValue {
  locale: Locale;
  t: Strings;
}

const LocaleContext = createContext<LocaleContextValue>({ locale: "uz", t: strings.uz });

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => ({ locale, t: strings[locale] }), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useT(): Strings {
  return useContext(LocaleContext).t;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function stringsFor(locale: Locale): Strings {
  return strings[locale];
}
