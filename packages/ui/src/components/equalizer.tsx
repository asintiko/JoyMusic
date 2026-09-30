import type { CSSProperties } from "react";
import { cx } from "../lib/cx";

export interface EqualizerProps {
  bars?: number;
  paused?: boolean;
  bpm?: number | null;
  height?: number;
  barWidth?: number;
  gap?: number;
  color?: string;
  label?: string;
  className?: string;
}

const patterns = [0.62, 1, 0.45, 0.85, 0.3, 0.95, 0.55, 0.75, 0.4, 0.9, 0.5, 0.7];

export function equalizerBarDuration(index: number, bpm: number | null | undefined): number {
  if (bpm && bpm > 0) {
    const beat = 60000 / bpm;
    return Math.round(index % 3 === 0 ? beat : index % 3 === 1 ? beat / 2 : beat * 1.5);
  }
  return 620 + ((index * 137) % 520);
}

export function Equalizer({
  bars = 4,
  paused = false,
  bpm,
  height = 20,
  barWidth = 3,
  gap = 3,
  color,
  label,
  className,
}: EqualizerProps) {
  const style = {
    "--jm-eq-height": `${height}px`,
    "--jm-eq-bar-width": `${barWidth}px`,
    "--jm-eq-gap": `${gap}px`,
    ...(color ? { "--jm-eq-color": color } : null),
  } as CSSProperties;
  return (
    <span
      className={cx("jm-eq", className)}
      data-paused={paused}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: bars }, (_, index) => {
        const peak = patterns[index % patterns.length] ?? 1;
        const barStyle = {
          "--jm-eq-max": peak,
          "--jm-eq-min": Math.max(0.16, peak * 0.28),
          "--jm-eq-rest": Math.max(0.22, peak * 0.42),
          "--jm-eq-duration": `${equalizerBarDuration(index, bpm)}ms`,
          "--jm-eq-delay": `${-((index * 173) % 700)}ms`,
        } as CSSProperties;
        return <span key={index} className="jm-eq-bar" style={barStyle} />;
      })}
    </span>
  );
}
