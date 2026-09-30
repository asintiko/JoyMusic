import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { formatDuration } from "../lib/format";
import { Cover } from "./cover";
import { Equalizer } from "./equalizer";

export type TrackRowState = "idle" | "playing" | "added" | "disabled";
export type TrackRowSize = "sm" | "md" | "lg";

export interface TrackRowProps {
  title: string;
  artist: string;
  album?: string | null;
  artworkUrl?: string | null;
  seed?: string;
  durationSec?: number | null;
  explicit?: boolean;
  explicitLabel?: string;
  index?: number;
  state?: TrackRowState;
  size?: TrackRowSize;
  trailing?: ReactNode;
  meta?: ReactNode;
  onSelect?: () => void;
  selectLabel?: string;
  className?: string;
}

const sizes = {
  sm: { cover: 40, title: "text-[13.5px]", artist: "text-[12px]", pad: "py-1.5" },
  md: { cover: 52, title: "text-[15px]", artist: "text-[13px]", pad: "py-2" },
  lg: { cover: 64, title: "text-[17px]", artist: "text-[14px]", pad: "py-2.5" },
} as const;

export function TrackRow({
  title,
  artist,
  album,
  artworkUrl,
  seed,
  durationSec,
  explicit,
  explicitLabel = "Explicit",
  index,
  state = "idle",
  size = "md",
  trailing,
  meta,
  onSelect,
  selectLabel,
  className,
}: TrackRowProps) {
  const dimension = sizes[size];
  const playing = state === "playing";
  const disabled = state === "disabled";
  const body = (
    <>
      {index !== undefined ? (
        <span
          className={cx(
            "type-mono w-5 shrink-0 text-center text-[12px]",
            playing ? "text-playing-fg" : "text-fg-subtle",
          )}
        >
          {index}
        </span>
      ) : null}
      <span className="relative shrink-0">
        <Cover
          src={artworkUrl}
          seed={seed ?? `${artist} ${title}`}
          size={dimension.cover}
          radius="sm"
        />
        {playing ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-sm bg-[rgb(6_4_12/0.62)] text-playing">
            <Equalizer bars={4} height={16} barWidth={3} gap={2.5} />
          </span>
        ) : null}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span
          className={cx(
            "block truncate font-bold leading-tight tracking-[-0.01em]",
            dimension.title,
            playing ? "text-playing-fg" : "text-fg",
          )}
        >
          {title}
        </span>
        <span
          className={cx("mt-0.5 flex min-w-0 items-center gap-1.5 text-fg-muted", dimension.artist)}
        >
          {explicit ? (
            <span
              title={explicitLabel}
              aria-label={explicitLabel}
              className="inline-flex size-[15px] shrink-0 items-center justify-center rounded-[4px] bg-fg-subtle text-[9px] font-extrabold leading-none text-canvas"
            >
              E
            </span>
          ) : null}
          <span className="truncate">{album ? `${artist} · ${album}` : artist}</span>
        </span>
        {meta ? <span className="mt-1 block">{meta}</span> : null}
      </span>
      {durationSec ? (
        <span className="type-mono shrink-0 text-[12px] text-fg-subtle">
          {formatDuration(durationSec)}
        </span>
      ) : null}
    </>
  );

  const shell = cx(
    "group/row flex min-w-0 items-center gap-3 rounded-md px-2 transition-colors duration-150",
    dimension.pad,
    !disabled && "hover:bg-surface-2",
    disabled && "opacity-50",
    playing && "bg-playing-soft",
    className,
  );

  return (
    <div className={shell} data-state={state} role="listitem">
      {onSelect ? (
        <button
          type="button"
          onClick={onSelect}
          disabled={disabled}
          aria-label={selectLabel ?? `${title} — ${artist}`}
          className="focus-ring -m-1 flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 text-left"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{body}</div>
      )}
      {trailing ? <div className="flex shrink-0 items-center gap-1">{trailing}</div> : null}
    </div>
  );
}
