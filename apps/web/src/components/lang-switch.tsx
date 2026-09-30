"use client";

import { cx } from "@joymusic/ui";
import { haptic } from "@/lib/haptics";
import { localeList } from "@/lib/locale";
import { useI18n } from "./i18n";

export function LangSwitch({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t.language}
      className={cx("jm-glass inline-flex h-9 items-center rounded-pill p-0.5", className)}
    >
      {localeList.map((code) => (
        <button
          key={code}
          type="button"
          lang={code}
          aria-pressed={code === locale}
          onClick={() => {
            haptic("tap");
            setLocale(code);
          }}
          className={cx(
            "focus-ring inline-flex h-8 min-w-9 items-center justify-center rounded-pill px-2.5 text-[11px] font-extrabold uppercase tracking-[0.06em] transition-colors",
            code === locale ? "bg-fg text-fg-inverse" : "text-fg-muted hover:text-fg",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
