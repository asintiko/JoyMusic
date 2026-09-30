"use client";

import { cx } from "@joymusic/ui";
import type { Locale } from "@joymusic/shared";
import { localeList, persistLocale } from "@/lib/locale";
import { landingPath } from "../seo";

const nativeNames: Record<Locale, string> = {
  uz: "Oʻzbekcha",
  ru: "Русский",
  en: "English",
};

export function LandingLangSwitch({
  locale,
  label,
  className,
}: {
  locale: Locale;
  label: string;
  className?: string;
}) {
  return (
    <nav
      aria-label={label}
      className={cx("inline-flex h-10 items-center rounded-full bg-white/[0.06] p-0.5", className)}
      style={{ boxShadow: "inset 0 0 0 1px var(--jm-line-strong)" }}
    >
      {localeList.map((code) => (
        <a
          key={code}
          href={landingPath(code)}
          hrefLang={code}
          lang={code}
          aria-label={nativeNames[code]}
          aria-current={code === locale ? "page" : undefined}
          onClick={() => persistLocale(code)}
          className={cx(
            "inline-flex h-9 min-w-10 items-center justify-center rounded-full px-2.5 text-[12px] font-extrabold uppercase tracking-[0.06em] no-underline transition-colors",
            code === locale ? "bg-fg text-fg-inverse" : "text-fg-muted hover:text-fg",
          )}
        >
          {code}
        </a>
      ))}
    </nav>
  );
}

export function LandingLangList({ locale, label }: { locale: Locale; label: string }) {
  return (
    <nav aria-label={label}>
      <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.12em] text-fg-subtle">
        {label}
      </p>
      <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
        {localeList.map((code) => (
          <li key={code}>
            <a
              className="lp-footer-link"
              href={landingPath(code)}
              hrefLang={code}
              lang={code}
              aria-current={code === locale ? "page" : undefined}
              onClick={() => persistLocale(code)}
              style={code === locale ? { color: "var(--jm-fg)" } : undefined}
            >
              {nativeNames[code]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
