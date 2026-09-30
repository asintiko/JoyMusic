"use client";

import { NowPlayingHero, useTrackProgress } from "@joymusic/ui";
import type { NowPlaying } from "@joymusic/shared";
import { useI18n } from "@/components/i18n";

export interface NowPlayingSectionProps {
  nowPlaying: NowPlaying;
  artwork: string | null;
  offsetMs: number;
  mine: boolean;
}

export function NowPlayingSection({ nowPlaying, artwork, offsetMs, mine }: NowPlayingSectionProps) {
  const { t } = useI18n();
  const progress = useTrackProgress({
    startedAt: nowPlaying.startedAt,
    durationSec: nowPlaying.durationSec,
    serverOffsetMs: offsetMs,
    intervalMs: 1000,
  });

  return (
    <div
      className="jm-rise flex flex-col items-center gap-3"
      key={`${nowPlaying.startedAt}-${nowPlaying.title}`}
    >
      {mine ? (
        <span
          data-testid="now-playing-mine"
          className="inline-flex h-7 items-center rounded-pill bg-playing-soft px-3 text-[11.5px] font-extrabold uppercase tracking-[0.1em] text-playing-fg"
        >
          {t.minePlaying}
        </span>
      ) : null}
      <NowPlayingHero
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
        size="phone"
      />
    </div>
  );
}
