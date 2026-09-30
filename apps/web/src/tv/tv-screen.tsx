"use client";

import { Gift, Lock, Radio, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import type { Locale, VenueState, VenueTheme } from "@joymusic/shared";
import {
  AmbientBackground,
  Logo,
  NowPlayingHero,
  QueueItem,
  Ticker,
  useTrackProgress,
} from "@joymusic/ui";
import { I18nProvider, useI18n } from "@/components/i18n";
import { artworkSrc } from "@/lib/art";
import { useExternalValue, type ExternalValue } from "@/lib/external-value";
import { useConnectivity, useVenueFeed } from "@/guest/use-venue-feed";
import { stageScale, tvDedications, tvMode, tvTicker, type TvMode } from "./tv-model";

export interface TvScreenProps {
  slug: string;
  initial: VenueState | null;
  locale: Locale;
  theme: VenueTheme;
  qrSvg: string;
  displayUrl: string;
  backdrop: string;
}

export function TvScreen(props: TvScreenProps) {
  return (
    <I18nProvider initialLocale={props.locale} persist={false}>
      <TvStage {...props} />
    </I18nProvider>
  );
}

function useStageScale() {
  useEffect(() => {
    const apply = () => {
      const scale = stageScale(window.innerWidth, window.innerHeight);
      document.documentElement.style.setProperty("--tv-scale", String(scale));
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, []);
}

function useClock(locale: Locale) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const format = new Intl.DateTimeFormat(locale === "uz" ? "uz-Latn" : locale, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const tick = () => setLabel(format.format(new Date()));
    tick();
    const timer = window.setInterval(tick, 10_000);
    return () => window.clearInterval(timer);
  }, [locale]);
  return label;
}

function TvStage({ slug, initial, theme, qrSvg, displayUrl, backdrop }: TvScreenProps) {
  const { t, locale } = useI18n();
  const feed = useVenueFeed({ slug, role: "tv", initial });
  const connected = useConnectivity(feed.status, 8000);
  const clock = useClock(locale);
  useStageScale();

  const { refresh } = feed;
  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute("data-theme", theme);
  }, [locale, theme]);

  const venue = feed.venue;
  const mode = tvMode(venue);
  const nowPlaying = venue?.nowPlaying ?? null;
  const showArtwork = venue?.venue.settings.showArtwork ?? true;
  const artwork =
    nowPlaying && showArtwork
      ? artworkSrc(nowPlaying.artworkUrl ?? nowPlaying.track?.artworkUrl ?? null, 1000)
      : null;
  const requestsOpen = venue?.venue.settings.requestsOpen ?? false;

  return (
    <div
      data-theme={theme}
      data-testid="tv-root"
      data-mode={mode}
      className="tv-root jm-root fixed inset-0 overflow-hidden"
    >
      <img src={backdrop} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
      <AmbientBackground
        seed={nowPlaying ? `${nowPlaying.artist} ${nowPlaying.title}` : `venue ${slug}`}
        src={artwork}
        intensity={mode === "playing" ? 0.9 : 0.75}
        grain={false}
        className="!bg-transparent opacity-80 mix-blend-screen"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,transparent_0%,var(--jm-canvas)_95%)] opacity-90" />
      {mode !== "playing" ? <IdleBackdrop /> : null}

      <div
        className="absolute left-1/2 top-1/2 h-[1080px] w-[1920px] origin-center"
        style={{ transform: "translate(-50%, -50%) scale(var(--tv-scale, 1))" } as CSSProperties}
      >
        <div className="tv-drift relative z-10 flex h-full flex-col">
          <header className="flex h-[112px] shrink-0 items-center justify-between px-20">
            <div className="flex items-center gap-8">
              <Logo variant="horizontal" height={44} decorative />
              <span className="h-8 w-px bg-line-strong" />
              <div className="leading-tight">
                <p className="text-[28px] font-extrabold tracking-[-0.02em]">
                  {venue?.venue.name ?? ""}
                </p>
                <p className="text-[18px] font-medium text-fg-muted">{venue?.venue.city ?? ""}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              {!connected ? (
                <span className="jm-glass inline-flex h-14 items-center gap-3 rounded-pill px-6 text-[22px] font-bold text-next-fg">
                  <WifiOff aria-hidden="true" className="size-6" />
                  {t.offlineBanner}
                </span>
              ) : mode === "waiting" ? null : (
                <span
                  data-testid="tv-status"
                  className={
                    requestsOpen
                      ? "jm-glass inline-flex h-14 items-center gap-3 rounded-pill px-6 text-[22px] font-bold text-playing-fg"
                      : "jm-glass inline-flex h-14 items-center gap-3 rounded-pill px-6 text-[22px] font-bold text-next-fg"
                  }
                >
                  {requestsOpen ? (
                    <span className="jm-pulse-dot size-3 rounded-full bg-playing" />
                  ) : (
                    <Lock aria-hidden="true" className="size-5" />
                  )}
                  {requestsOpen ? t.tvOpen : t.tvClosed}
                </span>
              )}
              <span className="type-mono-lg min-w-[120px] text-right text-[40px] text-fg">
                {clock}
              </span>
            </div>
          </header>

          {venue && mode === "playing" && nowPlaying ? (
            <PlayingLayout
              venue={venue}
              artwork={artwork}
              offset={feed.offset}
              qrSvg={qrSvg}
              displayUrl={displayUrl}
            />
          ) : (
            <IdleLayout mode={mode} venue={venue} qrSvg={qrSvg} displayUrl={displayUrl} />
          )}

          <TvFooter venue={venue} mode={mode} />
        </div>
      </div>
    </div>
  );
}

function IdleBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <span
        className="tv-aurora absolute -left-[12%] -top-[30%] size-[1100px] rounded-full opacity-55 blur-[140px]"
        style={{
          background: "radial-gradient(circle at 40% 40%, var(--jm-brand-from), transparent 68%)",
        }}
      />
      <span
        data-alt="true"
        className="tv-aurora absolute -right-[10%] top-[10%] size-[1000px] rounded-full opacity-50 blur-[150px]"
        style={{
          background: "radial-gradient(circle at 60% 50%, var(--jm-brand-to), transparent 66%)",
        }}
      />
    </div>
  );
}

function QrCard({
  qrSvg,
  displayUrl,
  size,
  compact,
}: {
  qrSvg: string;
  displayUrl: string;
  size: number;
  compact?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div
      className="jm-glass flex flex-col items-center gap-6 rounded-[40px] p-8 shadow-4"
      data-testid="tv-qr-card"
    >
      <div className="text-center">
        <p className="text-brand-gradient text-[38px] font-extrabold leading-[1.05] tracking-[-0.03em]">
          {t.tvOrder}
        </p>
        <p className="mt-2 text-[22px] font-semibold text-fg-muted">{t.tvScan}</p>
      </div>
      <div
        data-testid="tv-qr"
        role="img"
        aria-label={displayUrl}
        className="overflow-hidden rounded-[28px] bg-white shadow-3 [&>svg]:size-full"
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: qrSvg }}
      />
      <p className="type-mono text-[22px] text-fg-muted">{displayUrl}</p>
      {compact ? null : (
        <p className="text-center text-[17px] font-medium text-fg-subtle">{t.tvHint}</p>
      )}
    </div>
  );
}

function PlayingLayout({
  venue,
  artwork,
  offset,
  qrSvg,
  displayUrl,
}: {
  venue: VenueState;
  artwork: string | null;
  offset: ExternalValue<number>;
  qrSvg: string;
  displayUrl: string;
}) {
  const { t } = useI18n();
  const offsetMs = useExternalValue(offset);
  const nowPlaying = venue.nowPlaying;
  const progress = useTrackProgress({
    startedAt: nowPlaying?.startedAt,
    durationSec: nowPlaying?.durationSec,
    serverOffsetMs: offsetMs,
  });
  const upcoming = venue.queue.slice(0, 2);
  const dedications = tvDedications(venue);
  if (!nowPlaying) return null;

  return (
    <main className="grid min-h-0 flex-1 grid-cols-[1fr_492px] gap-16 px-20 pb-6">
      <div className="flex min-w-0 flex-col justify-between">
        <NowPlayingHero
          key={`${nowPlaying.startedAt}-${nowPlaying.title}`}
          title={nowPlaying.title}
          artist={nowPlaying.artist}
          artworkUrl={artwork}
          seed={`${nowPlaying.artist} ${nowPlaying.title}`}
          progress={progress.progress}
          elapsedSec={nowPlaying.durationSec ? progress.elapsedSec : null}
          durationSec={nowPlaying.durationSec}
          bpm={nowPlaying.bpm}
          musicalKey={nowPlaying.key}
          dedication={nowPlaying.dedicatedTo ? t.dedicationFor(nowPlaying.dedicatedTo) : null}
          nowPlayingLabel={t.nowPlaying}
          progressLabel={t.progress}
          showTimes={Boolean(nowPlaying.durationSec)}
          tilt={false}
          size="tv"
          layout="split"
        />
        <div className="min-h-[190px]">
          {upcoming.length > 0 ? (
            <>
              <p className="mb-4 text-[20px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">
                {t.tvUpNext}
              </p>
              <div role="list" className="grid grid-cols-2 gap-5" data-testid="tv-upcoming">
                {upcoming.map((request, index) => (
                  <QueueItem
                    key={request.id}
                    request={{ ...request, artworkUrl: artworkSrc(request.artworkUrl, 250) }}
                    variant="tv"
                    position={index + 1}
                    dedicationText={
                      request.dedicatedTo ? t.dedicationFor(request.dedicatedTo) : undefined
                    }
                  />
                ))}
              </div>
            </>
          ) : (
            <p className="text-[26px] font-semibold text-fg-muted">{t.tvNoRequests}</p>
          )}
        </div>
      </div>

      <aside className="flex min-w-0 flex-col gap-6">
        <QrCard qrSvg={qrSvg} displayUrl={displayUrl} size={340} />
        <div className="jm-glass flex flex-1 flex-col justify-center gap-4 rounded-[32px] px-8 py-6">
          <p className="flex items-center gap-3 text-[20px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">
            <Gift aria-hidden="true" className="size-6 text-brand" />
            {t.tvDedications}
          </p>
          {dedications.length > 0 ? (
            dedications.map((entry) => (
              <p
                key={entry.id}
                data-testid="tv-dedication"
                className="truncate text-[24px] font-bold leading-snug text-fg"
              >
                <span className="text-brand">{t.dedicationFor(entry.name)}</span>
                <span className="text-fg-muted"> · {entry.title}</span>
              </p>
            ))
          ) : (
            <p className="text-[22px] font-medium leading-snug text-fg-muted">
              {t.tvDedicationsEmpty}
            </p>
          )}
        </div>
      </aside>
    </main>
  );
}

const visualizerBars = Array.from({ length: 56 }, (_, index) => {
  const wave = Math.sin(index * 0.42) * 0.5 + Math.sin(index * 0.17 + 1.3) * 0.5;
  return {
    id: index,
    height: 60 + Math.round((wave + 1) * 55),
    duration: 900 + ((index * 173) % 900),
    delay: -((index * 97) % 1200),
  };
});

function IdleLayout({
  mode,
  venue,
  qrSvg,
  displayUrl,
}: {
  mode: TvMode;
  venue: VenueState | null;
  qrSvg: string;
  displayUrl: string;
}) {
  const { t } = useI18n();
  const waiting = mode === "waiting";
  const upcoming = venue?.queue.slice(0, 2) ?? [];
  return (
    <main className="grid min-h-0 flex-1 grid-cols-[1fr_560px] items-center gap-20 px-20 pb-6">
      <div className="flex min-w-0 flex-col gap-10">
        <div className="flex flex-col gap-6">
          <p className="flex items-center gap-4 text-[24px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">
            <Radio aria-hidden="true" className="size-8 text-brand" />
            {waiting ? t.tvNoSessionText : t.idleText}
          </p>
          <h1
            data-testid="tv-idle-title"
            className="font-display text-[104px] font-semibold leading-[1.02] tracking-[-0.03em] text-fg"
          >
            {waiting ? t.tvNoSessionTitle : t.tvIdleTitle}
          </h1>
          <p className="text-brand-gradient max-w-[900px] text-[44px] font-extrabold leading-tight tracking-[-0.02em]">
            {t.tvIdleText}
          </p>
        </div>
        <div aria-hidden="true" className="flex h-[170px] items-end gap-[10px]">
          {visualizerBars.map((bar) => (
            <span
              key={bar.id}
              className="tv-bar block w-[14px] rounded-full bg-brand-gradient"
              style={
                {
                  height: bar.height,
                  "--tv-bar-duration": `${bar.duration}ms`,
                  "--tv-bar-delay": `${bar.delay}ms`,
                  opacity: 0.45 + (bar.height / 170) * 0.55,
                } as CSSProperties
              }
            />
          ))}
        </div>
        {upcoming.length > 0 ? (
          <div role="list" data-testid="tv-upcoming" className="grid grid-cols-2 gap-5">
            {upcoming.map((request, index) => (
              <QueueItem
                key={request.id}
                request={{ ...request, artworkUrl: artworkSrc(request.artworkUrl, 250) }}
                variant="tv"
                position={index + 1}
                dedicationText={
                  request.dedicatedTo ? t.dedicationFor(request.dedicatedTo) : undefined
                }
              />
            ))}
          </div>
        ) : null}
      </div>
      <QrCard qrSvg={qrSvg} displayUrl={displayUrl} size={420} />
    </main>
  );
}

function TvFooter({ venue, mode }: { venue: VenueState | null; mode: TvMode }) {
  const { t } = useI18n();
  const entries = useMemo(() => {
    if (!venue) return [];
    const skip = mode === "playing" ? 2 : 2;
    return tvTicker(venue, skip);
  }, [venue, mode]);
  const fallback = entries.length === 0;
  const scrolling = entries.length > 2;
  const repeated = useMemo(() => {
    if (!scrolling) return [];
    const copies = Math.max(2, Math.ceil(10 / entries.length));
    return Array.from({ length: copies }, () => entries).flat();
  }, [entries, scrolling]);

  return (
    <footer className="jm-glass flex h-[96px] shrink-0 items-center rounded-none border-x-0 border-b-0">
      <span className="flex h-full shrink-0 items-center gap-3 bg-brand-gradient-strong px-12 text-[22px] font-extrabold uppercase tracking-[0.14em] text-on-brand">
        <Radio aria-hidden="true" className="size-7" />
        {fallback ? t.tvOrder : t.tvUpNext}
      </span>
      {fallback ? (
        <p className="min-w-0 flex-1 truncate px-14 text-[26px] font-bold text-fg-muted">
          {t.tvHint}
        </p>
      ) : !scrolling ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          {entries.map((item, index) => (
            <span
              key={item.id}
              className="flex items-center gap-4 pl-14 text-[26px] font-bold text-fg"
            >
              <span className="type-mono text-[20px] text-fg-subtle">{index + 3}</span>
              {item.title}
              <span className="font-medium text-fg-muted">{item.artist}</span>
              <span className="pl-10 text-fg-disabled">•</span>
            </span>
          ))}
        </div>
      ) : (
        <Ticker duration={Math.max(40, repeated.length * 7)} className="min-w-0 flex-1">
          {repeated.map((item, index) => (
            <span
              key={`${item.id}-${index}`}
              className="flex items-center gap-4 pl-14 text-[26px] font-bold text-fg"
            >
              <span className="type-mono text-[20px] text-fg-subtle">
                {(index % entries.length) + 3}
              </span>
              {item.title}
              <span className="font-medium text-fg-muted">{item.artist}</span>
              {item.pending && item.votes > 1 ? (
                <span className="type-mono text-[20px] text-brand">{t.tvVotes(item.votes)}</span>
              ) : null}
              <span className="pl-10 text-fg-disabled">•</span>
            </span>
          ))}
        </Ticker>
      )}
    </footer>
  );
}
