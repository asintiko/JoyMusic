import { Gauge, Gift } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useArtworkPalette } from "../hooks/use-artwork-palette";
import { usePrefersReducedMotion } from "../hooks/use-media-query";
import { coverPalette } from "../lib/cover-art";
import { cx } from "../lib/cx";
import { Cover } from "./cover";
import { Equalizer } from "./equalizer";
import { Marquee } from "./marquee";
import { ProgressBar } from "./progress-bar";

export type NowPlayingSize = "phone" | "desk" | "tv";
export type NowPlayingLayout = "stack" | "split";

export interface NowPlayingHeroProps {
  title: string;
  artist: string;
  artworkUrl?: string | null;
  seed?: string;
  progress: number;
  elapsedSec?: number | null;
  durationSec?: number | null;
  bpm?: number | null;
  musicalKey?: string | null;
  paused?: boolean;
  dedication?: string | null;
  nowPlayingLabel: string;
  progressLabel: string;
  size?: NowPlayingSize;
  layout?: NowPlayingLayout;
  showTimes?: boolean;
  tilt?: boolean;
  className?: string;
}

const scale = {
  phone: {
    cover: 272,
    radius: "cover" as const,
    title: "text-[25px] leading-[1.15]",
    artist: "text-[17px]",
    eyebrow: "text-[11px]",
    gap: "gap-4",
    eq: 18,
  },
  desk: {
    cover: 232,
    radius: "md" as const,
    title: "text-[21px] leading-[1.18]",
    artist: "text-[15px]",
    eyebrow: "text-[11px]",
    gap: "gap-4",
    eq: 16,
  },
  tv: {
    cover: 556,
    radius: "cover" as const,
    title: "text-[64px] leading-[1.1]",
    artist: "text-[34px]",
    eyebrow: "text-[22px]",
    gap: "gap-8",
    eq: 44,
  },
} as const;

export function NowPlayingHero({
  title,
  artist,
  artworkUrl,
  seed,
  progress,
  elapsedSec,
  durationSec,
  bpm,
  musicalKey,
  paused = false,
  dedication,
  nowPlayingLabel,
  progressLabel,
  size = "phone",
  layout = "stack",
  showTimes = true,
  tilt = true,
  className,
}: NowPlayingHeroProps) {
  const reduced = usePrefersReducedMotion();
  const dims = scale[size];
  const coverSeed = seed ?? `${artist} ${title}`;
  const palette = useArtworkPalette(artworkUrl);
  const accent = (palette.colors ?? coverPalette(coverSeed))[0];

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [9, -9]), {
    stiffness: 180,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-11, 11]), {
    stiffness: 180,
    damping: 18,
  });
  const glareX = useTransform(pointerX, [-0.5, 0.5], ["15%", "85%"]);
  const glareY = useTransform(pointerY, [-0.5, 0.5], ["10%", "90%"]);
  const tiltEnabled = tilt && !reduced;

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!tiltEnabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((event.clientY - rect.top) / rect.height - 0.5);
  };
  const resetTilt = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const pulsing = !paused && Boolean(bpm) && !reduced;
  const beatStyle = pulsing
    ? ({ "--jm-beat-duration": `${Math.round(60000 / (bpm ?? 120))}ms` } as CSSProperties)
    : undefined;

  const split = layout === "split";

  return (
    <section
      aria-label={nowPlayingLabel}
      className={cx(
        "flex w-full",
        split ? "flex-row items-center" : "flex-col items-center text-center",
        dims.gap,
        size === "tv" && split && "gap-[72px]",
        className,
      )}
    >
      <div
        className={cx("jm-tilt shrink-0", !split && "w-full")}
        style={{ maxWidth: dims.cover, width: split ? dims.cover : undefined }}
        onPointerMove={onPointerMove}
        onPointerLeave={resetTilt}
      >
        <div className={pulsing ? "jm-beat" : undefined} style={beatStyle}>
          <motion.div className="relative" style={tiltEnabled ? { rotateX, rotateY } : undefined}>
            <Cover
              src={artworkUrl}
              seed={coverSeed}
              alt={`${title} — ${artist}`}
              radius={dims.radius}
              priority
              className="w-full"
              style={{
                boxShadow: `0 40px 90px -24px ${accent}, 0 18px 40px -18px rgb(0 0 0 / 0.7)`,
              }}
            />
            <motion.span
              aria-hidden="true"
              className={cx(
                "jm-cover-glare pointer-events-none absolute inset-0",
                dims.radius === "cover" ? "rounded-cover" : "rounded-md",
              )}
              style={
                tiltEnabled
                  ? ({ "--jm-glare-x": glareX, "--jm-glare-y": glareY } as never)
                  : undefined
              }
            />
          </motion.div>
        </div>
      </div>

      <div
        className={cx(
          "flex min-w-0 flex-col",
          split ? "flex-1 items-start text-left" : "w-full items-center",
          size === "tv" ? "gap-6" : "gap-3",
        )}
      >
        <div
          className={cx(
            "flex flex-wrap items-center gap-x-3 gap-y-2 font-extrabold uppercase [font-kerning:none] tracking-[0.14em] text-playing-fg",
            dims.eyebrow,
            !split && "justify-center",
          )}
        >
          <Equalizer
            paused={paused}
            bpm={bpm}
            height={dims.eq}
            bars={size === "tv" ? 5 : 4}
            barWidth={size === "tv" ? 6 : 3}
            gap={size === "tv" ? 5 : 3}
            color="var(--jm-playing)"
          />
          <span>{nowPlayingLabel}</span>
          {bpm ? (
            <span
              className={cx(
                "type-mono inline-flex items-center gap-1 rounded-pill bg-surface-3 normal-case tracking-normal text-fg-muted",
                size === "tv" ? "px-4 py-1.5 !text-[24px]" : "px-2 py-0.5",
              )}
            >
              <Gauge aria-hidden="true" className={size === "tv" ? "size-6" : "size-3"} />
              {Math.round(bpm)}
              {musicalKey ? ` · ${musicalKey}` : ""}
            </span>
          ) : null}
        </div>

        <Marquee
          as="h2"
          className={cx(
            "w-full font-display font-semibold tracking-[-0.015em] text-fg",
            dims.title,
            !split && "text-center",
          )}
        >
          {title}
        </Marquee>
        <p className={cx("w-full truncate font-semibold text-fg-muted", dims.artist)}>{artist}</p>

        {dedication ? (
          <span
            className={cx(
              "inline-flex max-w-full items-center gap-2 rounded-pill bg-brand-soft font-bold text-brand shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--jm-brand)_30%,transparent)]",
              size === "tv"
                ? "h-14 px-6 text-[26px] [&_svg]:size-6"
                : "h-8 px-3.5 text-[13px] [&_svg]:size-4",
            )}
          >
            <Gift aria-hidden="true" className="shrink-0" />
            <span className="truncate">{dedication}</span>
          </span>
        ) : null}

        <ProgressBar
          progress={progress}
          label={progressLabel}
          size={size === "tv" ? "lg" : "md"}
          elapsedSec={elapsedSec}
          durationSec={durationSec}
          showTimes={showTimes}
          className={cx("mt-1", size === "tv" && "mt-4 [&_.type-mono]:text-[22px]")}
        />
      </div>
    </section>
  );
}
