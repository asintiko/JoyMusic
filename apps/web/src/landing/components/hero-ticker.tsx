"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { fill } from "../copy";
import { durationToSeconds, tickerTracks } from "../demo-data";

const rotateEverySeconds = 12;
const startOffsets = [41, 96, 18, 142, 67];

function clock(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function HeroTicker({
  live,
  nowPlaying,
  fromTable,
  simulated,
}: {
  live: string;
  nowPlaying: string;
  fromTable: string;
  simulated: string;
}) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const index = Math.floor(tick / rotateEverySeconds) % tickerTracks.length;
  const track = tickerTracks[index] ?? tickerTracks[0];
  if (!track) return null;
  const total = durationToSeconds(track.duration);
  const elapsed = ((startOffsets[index] ?? 0) + (tick % rotateEverySeconds)) % total;

  return (
    <div className="lp-glass w-full rounded-[1.25rem] p-4" role="group" aria-label={nowPlaying}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-playing-fg">
          <span className="lp-live-dot" aria-hidden="true" />
          {nowPlaying}
        </span>
        <span className="inline-flex items-center gap-2 text-[11px] font-bold text-fg-subtle">
          <span className="lp-bars" aria-hidden="true">
            <span style={{ "--d": "620ms" } as CSSProperties} />
            <span style={{ "--d": "840ms", "--s": "120ms" } as CSSProperties} />
            <span style={{ "--d": "700ms", "--s": "60ms" } as CSSProperties} />
            <span style={{ "--d": "980ms", "--s": "200ms" } as CSSProperties} />
          </span>
          {live}
        </span>
      </div>
      <div key={track.id} className="lp-ticker-swap mt-3">
        <p className="m-0 truncate font-display text-[17px] font-semibold leading-tight tracking-[-0.02em] text-fg">
          {track.title}
        </p>
        <p className="m-0 mt-1 truncate text-[14px] text-fg-muted">{track.artist}</p>
      </div>
      <div className="mt-3">
        <div className="lp-progress" aria-hidden="true">
          <span
            style={{
              transform: `scaleX(${Math.min(elapsed / total, 1)})`,
              transition: "transform 1s linear",
            }}
          />
        </div>
        <div className="mt-1.5 flex justify-between tabular-nums text-[11px] font-semibold text-fg-subtle">
          <span>{clock(elapsed)}</span>
          <span>{track.duration}</span>
        </div>
      </div>
      <p className="m-0 mt-3 flex items-center justify-between gap-2 border-t border-white/[0.08] pt-3 text-[12px] font-bold text-fg-muted">
        <span>{fill(fromTable, { n: track.table })}</span>
        <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.08em] text-fg-subtle">
          {simulated}
        </span>
      </p>
    </div>
  );
}
