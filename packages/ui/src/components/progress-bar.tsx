import type { CSSProperties } from "react";
import { cx } from "../lib/cx";
import { clamp, formatDuration } from "../lib/format";

export type ProgressTone = "brand" | "playing" | "neutral";

export interface ProgressBarProps {
  progress: number;
  label: string;
  tone?: ProgressTone;
  size?: "xs" | "sm" | "md" | "lg";
  smooth?: boolean;
  elapsedSec?: number | null;
  durationSec?: number | null;
  showTimes?: boolean;
  className?: string;
}

const trackHeights = { xs: "h-0.5", sm: "h-1", md: "h-1.5", lg: "h-2.5" } as const;

const fillClasses: Record<ProgressTone, string> = {
  brand: "bg-brand-gradient",
  playing: "bg-playing",
  neutral: "bg-fg",
};

export function ProgressBar({
  progress,
  label,
  tone = "brand",
  size = "md",
  smooth = true,
  elapsedSec,
  durationSec,
  showTimes = false,
  className,
}: ProgressBarProps) {
  const value = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const elapsed = elapsedSec ?? (durationSec ? value * durationSec : null);
  const remaining = durationSec && elapsed !== null ? durationSec - elapsed : null;
  const fillStyle = { "--jm-progress": value } as CSSProperties;
  return (
    <div className={cx("w-full", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        className={cx(
          "relative w-full overflow-hidden rounded-pill bg-[color-mix(in_oklab,var(--jm-fg)_14%,transparent)]",
          trackHeights[size],
        )}
      >
        <div
          className={cx("jm-progress-fill absolute inset-0 rounded-pill", fillClasses[tone])}
          data-smooth={smooth || undefined}
          style={fillStyle}
        />
      </div>
      {showTimes && elapsed !== null ? (
        <div className="type-mono mt-2 flex justify-between text-fg-subtle" aria-hidden="true">
          <span>{formatDuration(elapsed)}</span>
          <span>{remaining !== null ? `-${formatDuration(remaining)}` : ""}</span>
        </div>
      ) : null}
    </div>
  );
}
