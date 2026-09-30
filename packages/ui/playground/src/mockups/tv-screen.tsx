import { Gift, Radio } from "lucide-react";
import { AmbientBackground, Logo, NowPlayingHero, QueueItem, Ticker } from "../../../src";
import {
  buildRequest,
  dedicationNames,
  nowPlayingStartedOffset,
  nowPlayingTrack,
  tracks,
} from "../data";
import { usePlayground } from "../context";
import { backdropFor } from "../images";
import { Frame, QrPlaceholder } from "./kit";

export function TvScreen() {
  const { lang, theme, s } = usePlayground();
  const track = nowPlayingTrack;
  const seed = `${track.artist} ${track.title}`;
  const names = dedicationNames(lang);
  const dedication = `${s.dedicationFor(names[0] ?? "")}, ${s.dedicationSample}`;
  const upcoming = [
    buildRequest(1, "accepted", { votes: 3, dedicatedTo: names[1] ?? null }),
    buildRequest(3, "accepted", { votes: 2 }),
  ];
  const ticker = [tracks[4], tracks[5], tracks[6], tracks[7], tracks[8], tracks[9]];
  const dedications = [
    { name: names[1] ?? "", track: tracks[1] },
    { name: names[2] ?? "", track: tracks[7] },
  ];

  return (
    <Frame width={1920} height={1080} label="tv-screen">
      <img
        src={backdropFor(theme)}
        alt=""
        className="absolute inset-0 size-full object-cover opacity-45"
      />
      <AmbientBackground
        seed={seed}
        intensity={0.9}
        className="!bg-transparent mix-blend-screen opacity-80"
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_40%,transparent_0%,var(--jm-canvas)_95%)] opacity-90" />

      <div className="relative z-10 flex h-full flex-col">
        <header className="flex h-[112px] shrink-0 items-center justify-between px-20">
          <div className="flex items-center gap-8">
            <Logo variant="horizontal" height={44} />
            <span className="h-8 w-px bg-line-strong" />
            <div className="leading-tight">
              <p className="text-[28px] font-extrabold tracking-[-0.02em]">{s.venueName}</p>
              <p className="text-[18px] font-medium text-fg-muted">{s.venueCity}</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="jm-glass inline-flex h-14 items-center gap-3 rounded-pill px-6 text-[22px] font-bold text-playing-fg">
              <span className="jm-pulse-dot size-3 rounded-full bg-playing" />
              {s.tvOpen}
            </span>
            <span className="type-mono-lg text-[40px] text-fg">22:47</span>
          </div>
        </header>

        <main className="grid min-h-0 flex-1 grid-cols-[1fr_492px] gap-16 px-20 pb-6">
          <div className="flex min-w-0 flex-col justify-between">
            <NowPlayingHero
              title={track.title}
              artist={track.artist}
              seed={seed}
              progress={nowPlayingStartedOffset / track.durationSec}
              elapsedSec={nowPlayingStartedOffset}
              durationSec={track.durationSec}
              bpm={track.bpm}
              musicalKey={track.key}
              dedication={dedication}
              nowPlayingLabel={s.nowPlaying}
              progressLabel={s.progress}
              size="tv"
              layout="split"
            />
            <div>
              <p className="mb-4 text-[20px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">
                {s.tvUpNext}
              </p>
              <div role="list" className="grid grid-cols-2 gap-5">
                {upcoming.map((request, index) => (
                  <QueueItem
                    key={request.title}
                    request={request}
                    variant="tv"
                    position={index + 1}
                    dedicationText={
                      request.dedicatedTo ? s.dedicationFor(request.dedicatedTo) : undefined
                    }
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-6">
            <div className="jm-glass flex flex-col items-center gap-6 rounded-[40px] p-8 shadow-4">
              <div className="text-center">
                <p className="text-[38px] font-extrabold leading-[1.05] tracking-[-0.03em] text-brand-gradient">
                  {s.tvOrder}
                </p>
                <p className="mt-2 text-[22px] font-semibold text-fg-muted">{s.tvScan}</p>
              </div>
              <QrPlaceholder seed={`${s.venueName}-tv`} size={340} radius={26} />
              <p className="type-mono text-[22px] text-fg-muted">joy.music/nomad</p>
              <p className="text-center text-[17px] font-medium text-fg-subtle">{s.tvHint}</p>
            </div>
            <div className="jm-glass flex flex-1 flex-col justify-center gap-4 rounded-[32px] px-8 py-6">
              <p className="flex items-center gap-3 text-[20px] font-extrabold uppercase tracking-[0.16em] text-fg-subtle">
                <Gift aria-hidden="true" className="size-6 text-brand" />
                {s.tvDedications}
              </p>
              {dedications.map((entry) => (
                <p key={entry.name} className="text-[24px] font-bold leading-snug text-fg">
                  <span className="text-brand">{s.dedicationFor(entry.name)}</span>
                  <span className="text-fg-muted"> · {entry.track?.title}</span>
                </p>
              ))}
            </div>
          </aside>
        </main>

        <footer className="jm-glass flex h-[96px] shrink-0 items-center rounded-none border-x-0 border-b-0">
          <span className="flex h-full shrink-0 items-center gap-3 bg-brand-gradient-strong px-12 text-[22px] font-extrabold uppercase tracking-[0.14em] text-on-brand">
            <Radio aria-hidden="true" className="size-7" />
            {s.tvUpNext}
          </span>
          <Ticker duration={60} className="min-w-0 flex-1">
            {ticker.map((item, index) =>
              item ? (
                <span
                  key={item.id}
                  className="flex items-center gap-4 pl-14 text-[26px] font-bold text-fg"
                >
                  <span className="type-mono text-[20px] text-fg-subtle">{index + 3}</span>
                  {item.title}
                  <span className="font-medium text-fg-muted">{item.artist}</span>
                  <span className="pl-10 text-fg-disabled">•</span>
                </span>
              ) : null,
            )}
          </Ticker>
        </footer>
      </div>
    </Frame>
  );
}
