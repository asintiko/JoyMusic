import { Keyboard } from "lucide-react";
import {
  AmbientBackground,
  IconButton,
  Logo,
  NowPlayingHero,
  QueueItem,
  SearchInput,
} from "../../../src";
import { buildRequest, dedicationNames, nowPlayingStartedOffset, nowPlayingTrack } from "../data";
import { usePlayground } from "../context";
import { images } from "../images";
import { Frame, HomeIndicator, LangSwitch, PhoneStatusBar } from "./kit";

export function GuestNowPlaying() {
  const { lang, photo, s } = usePlayground();
  const track = nowPlayingTrack;
  const artwork = photo ? images.heroLanding : null;
  const seed = `${track.artist} ${track.title}`;
  const dedication = `${s.dedicationFor(dedicationNames(lang)[0] ?? "")}, ${s.dedicationSample}`;
  const progress = nowPlayingStartedOffset / track.durationSec;

  const upcoming = [
    { index: 1, status: "playing" as const, mine: true, dedicatedTo: null, tableLabel: null, votes: 1 },
    { index: 3, status: "accepted" as const, mine: false, dedicatedTo: null, tableLabel: null, votes: 3 },
    { index: 4, status: "accepted" as const, mine: false, dedicatedTo: null, tableLabel: null, votes: 1 },
    { index: 6, status: "pending" as const, mine: false, dedicatedTo: null, tableLabel: null, votes: 1 },
  ];

  return (
    <Frame width={390} height={844} label="guest-now-playing">
      <AmbientBackground src={artwork} seed={seed} imageBackdrop={Boolean(artwork)} />
      <div className="relative z-10 flex h-full flex-col">
        <PhoneStatusBar />
        <header className="flex items-center justify-between px-5 pb-1 pt-2">
          <div className="flex items-center gap-2.5">
            <Logo variant="mark" height={28} />
            <div className="leading-tight">
              <p className="text-[14px] font-extrabold tracking-[-0.01em]">{s.venueName}</p>
              <p className="text-[11.5px] font-medium text-fg-muted">{s.venueCity}</p>
            </div>
          </div>
          <LangSwitch active={lang} />
        </header>

        <div className="px-6 pt-4">
          <NowPlayingHero
            title={track.title}
            artist={track.artist}
            artworkUrl={artwork}
            seed={seed}
            progress={progress}
            elapsedSec={nowPlayingStartedOffset}
            durationSec={track.durationSec}
            bpm={track.bpm}
            musicalKey={track.key}
            dedication={dedication}
            nowPlayingLabel={s.nowPlaying}
            progressLabel={s.progress}
            size="phone"
          />
        </div>

        <section className="relative mt-5 min-h-0 flex-1 px-3">
          <h3 className="type-eyebrow px-2 pb-2 text-fg-subtle">{s.upNext}</h3>
          <div role="list" className="flex flex-col gap-0.5">
            {upcoming.map((entry, position) => {
              const track = buildRequest(entry.index, entry.status === "playing" ? "accepted" : entry.status, {
                votes: entry.votes,
                mine: entry.mine,
              });
              return (
                <QueueItem
                  key={entry.index}
                  request={track}
                  position={position + 1}
                  mineLabel={s.mine}
                  variant="guest"
                />
              );
            })}
          </div>
        </section>

        <div className="jm-glass absolute inset-x-0 bottom-0 z-20 rounded-t-2xl px-4 pb-8 pt-3">
          <div className="flex items-center gap-2">
            <SearchInput
              value=""
              onValueChange={() => undefined}
              placeholder={s.searchPlaceholder}
              size="lg"
              aria-label={s.searchPlaceholder}
              wrapperClassName="flex-1"
            />
            <IconButton
              label={s.requestByText}
              icon={<Keyboard aria-hidden="true" className="size-5" />}
              variant="primary"
              size="lg"
              className="!size-[52px] !rounded-full"
            />
          </div>
        </div>
        <HomeIndicator />
      </div>
    </Frame>
  );
}

