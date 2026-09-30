import { useId } from "react";
import { cx } from "../lib/cx";

export interface SparklineProps {
  values: readonly number[];
  width?: number;
  height?: number;
  tone?: "brand" | "playing" | "next" | "danger";
  fill?: boolean;
  label?: string;
  className?: string;
}

const strokes = {
  brand: "var(--jm-brand)",
  playing: "var(--jm-playing)",
  next: "var(--jm-next)",
  danger: "var(--jm-danger)",
} as const;

export function sparklinePath(values: readonly number[], width: number, height: number): string {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * width,
    y: pad + (1 - (value - min) / span) * (height - pad * 2),
  }));
  let path = `M${points[0]?.x.toFixed(2)} ${points[0]?.y.toFixed(2)}`;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    if (!previous || !current) continue;
    const midX = (previous.x + current.x) / 2;
    path += ` C${midX.toFixed(2)} ${previous.y.toFixed(2)} ${midX.toFixed(2)} ${current.y.toFixed(2)} ${current.x.toFixed(2)} ${current.y.toFixed(2)}`;
  }
  return path;
}

export function Sparkline({
  values,
  width = 120,
  height = 36,
  tone = "brand",
  fill = true,
  label,
  className,
}: SparklineProps) {
  const uid = useId().replace(/:/g, "");
  const path = sparklinePath(values, width, height);
  const color = strokes[tone];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx("overflow-visible", className)}
    >
      <defs>
        <linearGradient id={`jm-spark-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.32" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && path ? (
        <path d={`${path} L${width} ${height} L0 ${height} Z`} fill={`url(#jm-spark-${uid})`} />
      ) : null}
      <path d={path} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" />
    </svg>
  );
}
