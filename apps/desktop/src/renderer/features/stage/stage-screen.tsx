import { useEffect, useMemo } from "react";
import { Gift, Radio } from "lucide-react";
import {
  AmbientBackground,
  Logo,
  NowPlayingHero,
  QueueItem,
  Ticker,
  useTrackProgress,
} from "@joymusic/ui";
import type { ThemeId } from "@joymusic/ui";
import type { VenueState } from "@joymusic/shared";
import backdropCafe from "@joymusic/brand/assets/generated/web/backdrop-cafe-2560.webp";
import backdropLounge from "@joymusic/brand/assets/generated/web/backdrop-lounge-2560.webp";
import backdropClub from "@joymusic/brand/assets/generated/web/hero-landing-2560.webp";
import type { StageConfig } from "../../../common/bridge";
import { LocaleProvider, useT } from "../../i18n";
import { useNow, useRealtime, useTopic } from "../../lib/topics";
import { useApplyStageTheme } from "../../state/appearance";
import { StageQr } from "./stage-qr";

const backdrops: Record<ThemeId, string> = {
  club: backdropClub,
  lounge: backdropLounge,
  cafe: backdropCafe,
};

export function resolveStageTheme(config: StageConfig | null): ThemeId {
  if (!config) return "club";
  return config.themeOverride === "venue" ? config.venueTheme : config.themeOverride;
}

export function StageScreen() {
  const config = useTopic("stageConfig");
  const settings = useTopic("settings");
  const locale = config?.locale ?? settings.locale;
  return (
    <LocaleProvider locale={locale}>
      <StageContent config={config} />
    </LocaleProvider>
  );
}

function StageClock() {
  const now = useNow(10_000);
  const date = new Date(now);
  const text = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return <span className="type-mono-lg text-[40px] text-fg">{text}</span>;
}

function StageContent({ config }: { config: StageConfig | null }) {
  const theme = resolveStageTheme(config);
  useApplyStageTheme(theme);
  const update = useRealtime(config ? { venue: config.venueSlug, role: "tv" } : null);
  const state = update?.state ?? null;

  useEffect(() => {
    document.documentElement.dataset.stage = "true";
    return () => {
      delete document.documentElement.dataset.stage;
    };
  }, []);

  if (!config) return <StageWaiting />;
  return (
    <StageView
      config={config}
      theme={theme}
      state={state}
      offsetMs={update?.offsetMs ?? 0}
      connected={update?.status === "open"}
    />
  );
}

function StageWaiting() {
  const t = useT();
  return (
    <main
      data-testid="stage-waiting"
      className="relative flex h-dvh w-screen items-center justify-center overflow-hidden bg-canvas"
    >
      <AmbientBackground seed="joy-stage-waiting" intensity={0.9} />
      <div className="relative z-10 flex flex-col items-center gap-8">
        <Logo variant="stacked" height={160} />
        <p className="text-[28px] font-semibold text-fg-muted">{t.stageWaiting}</p>
      </div>
    </main>
  );
}

interface StageViewProps {
  config: StageConfig;
  theme: ThemeId;
  state: VenueState | null;
  offsetMs: number;
  connected: boolean;
}

function StageView({ config, theme, state, offsetMs, connected }: StageViewProps) {
  const t = useT();
  const nowPlaying = state?.nowPlaying ?? null;
  const upcoming = state?.queue.slice(0, 2) ?? [];
  const ticker = state?.queue.slice(2, 12) ?? [];
  const dedications = useMemo(
    () =>
      (state?.queue ?? [])
        .filter((request) => request.dedicatedTo)
        .slice(0, 3)
        .map((request) => ({ name: request.dedicatedTo ?? "", title: request.title })),
    [state],
  );
  const progress = useTrackProgress({
    startedAt: nowPlaying?.startedAt,
    durationSec: nowPlaying?.durationSec,
    serverOffsetMs: offsetMs,
  });
  const requestsOpen = state?.venue.settings.requestsOpen ?? true;
  const seed = nowPlaying ? `${nowPlaying.artist} ${nowPlaying.title}` : config.venueSlug;
  const backdrop = config.coverUrl ?? backdrops[theme];
  const idle = !nowPlaying;

  return (
    <div
      data-testid="stage"
      data-theme-active={theme}
      data-idle={idle}
      data-connected={connected}
      className="relative h-dvh w-screen cursor-none overflow-hidden bg-canvas text-fg"
    >
      <img src={backdrop} alt="" className="absolute inset-0 size-full object-cover opacity-45" />
      <AmbientBackground
        src={nowPlaying?.artworkUrl}
        seed={seed}
        intensity={idle ? 1.05 : 0.9}
        className="!bg-transparent mix-blend-screen opacity-80"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,transparent_0%,var(--jm-canvas)_95%)] opacity-90" />

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex h-[112px] shrink-0 items-center justify-between px-20">
          <div className="flex items-center gap-8">
            <Logo variant="horizontal" height={44} />
            <span className="h-8 w-px bg-line-strong" />
            <div className="leading-tight">
              <p className="text-[28px] font-extrabold tracking-[-0.02em]">{config.venueName}</p>
              {config.venueCity ? (
                <p className="text-[18px] font-medium text-fg-muted">{config.venueCity}</p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span
              className={`jm-glass inline-flex h-14 items-center gap-3 rounded-pill px-6 text-[22px] font-bold ${requestsOpen ? "text-playing-fg" : "text-next-fg"}`}
            >
              <span
                className={`size-3 rounded-full ${requestsOpen ? "jm-pulse-dot bg-playing" : "bg-next"}`}
              />
              {requestsOpen ? t.stagePillOpen : t.stagePillClosed}
            </span>
            <StageClock />
          </div>
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-[1fr_492px] gap-16 px-20 pb-6">
          <div className="flex min-w-0 flex-col justify-between">
            {nowPlaying ? (
              <NowPlayingHero
                title={nowPlaying.title}
                artist={nowPlaying.artist}
                artworkUrl={nowPlaying.artworkUrl}
                seed={seed}
                progress={progress.progress}
                elapsedSec={nowPlaying.durationSec ? progress.elapsedSec : null}
                durationSec={nowPlaying.durationSec}
                bpm={nowPlaying.bpm}
                musicalKey={nowPlaying.key}
                dedication={nowPlaying.dedicatedTo ? t.dedicationFor(nowPlaying.dedicatedTo) : null}
                nowPlayingLabel={t.nowPlaying}
                progressLabel={t.progress}
                size="tv"
                layout="split"
                tilt={false}
              />
            ) : (
              <div className="flex flex-1 flex-col justify-center gap-6" data-testid="stage-idle">
                <p className="text-[24px] font-extrabold uppercase tracking-[0.18em] text-playing-fg">
                  {t.stageIdleEyebrow}
                </p>
                <h1 className="max-w-[1000px] font-display text-[112px] font-semibold leading-[1.02] tracking-[-0.03em] text-brand-gradient">
                  {t.stageIdleTitle}
                </h1>
                <p className="text-[36px] font-semibold text-fg-muted">{t.stageIdleBody}</p>
              </div>
            )}
            {upcoming.length > 0 ? (
              <div>
                <p className="mb-4 text-[20px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">
                  {t.stageUpNext}
                </p>
                <div role="list" className="grid grid-cols-2 gap-5">
                  {upcoming.map((request, index) => (
                    <QueueItem
                      key={request.id}
                      request={request}
                      variant="tv"
                      position={index + 1}
                      dedicationText={
                        request.dedicatedTo ? t.dedicationFor(request.dedicatedTo) : undefined
                      }
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="flex min-w-0 flex-col gap-6">
            <div className="jm-glass flex flex-col items-center gap-6 rounded-[40px] p-8 shadow-4">
              <div className="text-center">
                <p className="text-[38px] font-extrabold leading-[1.05] tracking-[-0.03em] text-brand-gradient">
                  {t.stageOrder}
                </p>
                <p className="mt-2 text-[22px] font-semibold text-fg-muted">{t.stageScan}</p>
              </div>
              <StageQr url={config.qrUrl} theme={theme} size={340} />
              <p className="type-mono text-[22px] text-fg-muted" data-testid="stage-url">
                {config.displayUrl}
              </p>
              <p className="text-center text-[17px] font-medium text-fg-subtle">{t.stageHint}</p>
            </div>
            {dedications.length > 0 ? (
              <div className="jm-glass flex flex-1 flex-col justify-center gap-4 rounded-[32px] px-8 py-6">
                <p className="flex items-center gap-3 text-[20px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">
                  <Gift aria-hidden="true" className="size-6 text-brand" />
                  {t.stageDedications}
                </p>
                {dedications.map((entry) => (
                  <p
                    key={`${entry.name}-${entry.title}`}
                    className="text-[24px] font-bold leading-snug text-fg"
                  >
                    <span className="text-brand">{t.dedicationFor(entry.name)}</span>
                    <span className="text-fg-muted"> · {entry.title}</span>
                  </p>
                ))}
              </div>
            ) : (
              <div className="flex-1" />
            )}
          </aside>
        </main>

        {ticker.length > 0 ? (
          <footer className="jm-glass flex h-[96px] shrink-0 items-center rounded-none border-x-0 border-b-0">
            <span className="flex h-full shrink-0 items-center gap-3 bg-brand-gradient-strong px-12 text-[22px] font-extrabold uppercase tracking-[0.14em] text-on-brand">
              <Radio aria-hidden="true" className="size-7" />
              {t.stageUpNext}
            </span>
            <Ticker duration={60} className="min-w-0 flex-1">
              {ticker.map((item, index) => (
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
            </Ticker>
          </footer>
        ) : (
          <footer className="h-[96px] shrink-0" />
        )}
      </div>
    </div>
  );
}
