"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Locale } from "@joymusic/shared";
import { persistLocale } from "@/lib/locale";
import { messages, type Messages } from "@/lib/messages";

interface I18nValue {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  initialLocale,
  persist = true,
  children,
}: {
  initialLocale: Locale;
  persist?: boolean;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      if (persist) persistLocale(next);
      if (typeof document !== "undefined") document.documentElement.lang = next;
    },
    [persist],
  );

  const value = useMemo<I18nValue>(
    () => ({ locale, t: messages[locale], setLocale }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
