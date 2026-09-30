"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import type { KeyboardEvent } from "react";
import { Equalizer, GenerativeCover, Logo, cx } from "@joymusic/ui";
import type { VenueTheme } from "@joymusic/shared";
import type { LandingCopy } from "../types";

const themeOrder = ["club", "lounge", "cafe"] as const satisfies readonly VenueTheme[];

const backdrops: Record<VenueTheme, { name: string; width: number; height: number }> = {
  club: { name: "hero-landing-1280", width: 1280, height: 724 },
  lounge: { name: "backdrop-lounge-1280", width: 1280, height: 724 },
  cafe: { name: "backdrop-cafe-1280", width: 1280, height: 724 },
};

const queue = [
  { id: "tt-1", title: "Silk Road Neon", artist: "Kizil Atlas" },
  { id: "tt-2", title: "Midnight Bazaar", artist: "Atlas Lights" },
];

export function ThemesShowcase({
  copy,
  initial = "club",
  placeholders,
}: {
  copy: LandingCopy["themes"];
  initial?: VenueTheme;
  placeholders: Record<VenueTheme, string>;
}) {
  const [theme, setTheme] = useState<VenueTheme>(initial);
  const [seen, setSeen] = useState<ReadonlySet<VenueTheme>>(() => new Set([initial]));

  const choose = (next: VenueTheme) => {
    setTheme(next);
    setSeen((current) => (current.has(next) ? current : new Set(current).add(next)));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = themeOrder[(index + delta + themeOrder.length) % themeOrder.length];
    if (!next) return;
    choose(next);
    document.getElementById(`theme-tab-${next}`)?.focus();
  };

  const info = copy.items[theme];

  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.6fr)] lg:gap-14">
      <div>
        <div
          role="radiogroup"
          aria-label={copy.switchLabel}
          className="inline-flex w-full max-w-md rounded-full bg-white/[0.06] p-1"
          style={{ boxShadow: "inset 0 0 0 1px var(--jm-line-strong)" }}
        >
          {themeOrder.map((code, index) => (
            <button
              key={code}
              id={`theme-tab-${code}`}
              type="button"
              role="radio"
              aria-checked={theme === code}
              tabIndex={theme === code ? 0 : -1}
              data-theme-option={code}
              onClick={() => choose(code)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cx(
                "inline-flex h-11 flex-1 items-center justify-center rounded-full text-[14px] font-extrabold transition-colors",
                theme === code ? "bg-fg text-fg-inverse" : "text-fg-muted hover:text-fg",
              )}
            >
              {copy.items[code].name}
            </button>
          ))}
        </div>
        <h3 className="lp-headline mb-0 mt-8 text-[1.75rem] md:text-[2rem]" aria-live="polite">
          {info.name}
        </h3>
        <p className="lp-lead mb-0 mt-3 max-w-md">{info.text}</p>
      </div>

      <div
        className="lp-theme-stage min-h-[34rem] sm:aspect-[16/10] sm:min-h-0"
        data-theme={theme}
        data-testid="theme-stage"
        role="img"
        aria-label={`${copy.previewLabel}: ${info.name}`}
      >
        {themeOrder.map((code) =>
          seen.has(code) ? (
            <div
              key={code}
              className="lp-theme-backdrop"
              style={{
                opacity: theme === code ? 1 : 0,
                transition: "opacity 600ms var(--jm-ease-out)",
                backgroundImage: `url(${placeholders[code]})`,
                backgroundSize: "cover",
              }}
              aria-hidden="true"
            >
              <img
                src={`/landing/${backdrops[code].name}.webp`}
                width={backdrops[code].width}
                height={backdrops[code].height}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </div>
          ) : null,
        )}
        <div className="lp-theme-veil" aria-hidden="true" />
        <div className="relative flex h-full min-h-[inherit] items-center justify-center gap-8 p-5 sm:justify-end sm:p-8 lg:pr-[10%]">
          <div className="hidden max-w-[16rem] sm:block">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand">
              {copy.previewLabel}
            </p>
            <p className="m-0 mt-2 font-display text-[1.6rem] font-bold leading-[1.1] tracking-[-0.03em]">
              {info.venue}
            </p>
            <ul className="m-0 mt-5 flex list-none gap-2 p-0">
              {["--jm-surface-3", "--jm-brand", "--jm-playing"].map((variable) => (
                <li key={variable}>
                  <span
                    className="block size-8 rounded-full"
                    style={{
                      background: `var(${variable})`,
                      boxShadow: "inset 0 0 0 1px var(--jm-line-strong)",
                      transition: "background 500ms",
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className="lp-mini-phone w-[15.5rem] shrink-0" aria-hidden="true">
            <div className="lp-mini-screen h-[27rem]">
              <div className="lp-mini-glow" />
              <div className="relative z-[1] flex h-full flex-col">
                <div className="flex items-center gap-2 px-4 pb-1 pt-4">
                  <Logo variant="mark" tone="theme" height={20} decorative />
                  <p className="m-0 min-w-0 flex-1 truncate text-[12px] font-extrabold">
                    {info.venue}
                  </p>
                  <span className="lp-live-dot" />
                </div>
                <div className="flex flex-col items-center px-4 pt-2 text-center">
                  <div className="size-[7.5rem] overflow-hidden rounded-[var(--jm-radius-cover)] shadow-[var(--jm-shadow-3)]">
                    <GenerativeCover seed={`${theme}-velvet`} className="size-full" />
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-playing-fg">
                    <Equalizer
                      bars={4}
                      height={11}
                      barWidth={3}
                      gap={2}
                      color="var(--jm-playing)"
                    />
                    {copy.nowPlaying}
                  </div>
                  <p className="m-0 mt-1 font-display text-[15px] font-semibold tracking-[-0.02em]">
                    Velvet Circuit
                  </p>
                  <p className="m-0 text-[12px] text-fg-muted">Marble Hours</p>
                  <div className="lp-progress mt-3 w-full">
                    <span
                      style={{
                        transform: "scaleX(0.38)",
                        background:
                          "linear-gradient(90deg, var(--jm-brand-from), var(--jm-brand-to))",
                      }}
                    />
                  </div>
                </div>
                <div className="mt-3 px-4">
                  <p className="m-0 text-[10px] font-extrabold uppercase tracking-[0.12em] text-fg-subtle">
                    {copy.upNext}
                  </p>
                  {queue.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-2.5 border-b border-line py-2"
                    >
                      <div className="size-8 shrink-0 overflow-hidden rounded-lg">
                        <GenerativeCover seed={`${theme}-${track.id}`} className="size-full" />
                      </div>
                      <div className="min-w-0">
                        <p className="m-0 truncate text-[12px] font-bold">{track.title}</p>
                        <p className="m-0 truncate text-[11px] text-fg-muted">{track.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-auto p-3">
                  <div className="flex h-11 items-center justify-center gap-2 rounded-full bg-brand-gradient-strong text-[13px] font-extrabold text-on-brand">
                    <Plus size={16} />
                    {copy.request}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
