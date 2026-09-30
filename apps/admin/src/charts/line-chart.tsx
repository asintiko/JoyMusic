import { useId, useMemo, useState } from "react";
import type { PointerEvent } from "react";
import {
  areaPathFrom,
  linearScale,
  monotonePath,
  nearestIndex,
  niceTicks,
} from "../lib/chart-data";
import { ChartTooltip } from "./chart-tooltip";
import { useElementWidth } from "./use-size";

export interface LineSeries {
  id: string;
  label: string;
  color: string;
  values: readonly number[];
}

export interface LineChartProps {
  series: readonly LineSeries[];
  xLabels: readonly string[];
  ariaLabel: string;
  height?: number;
  formatValue?: (value: number) => string;
  faded?: boolean;
}

const margin = { top: 16, right: 16, bottom: 24, left: 36 };

export function ChartLegend({
  series,
}: {
  series: readonly Pick<LineSeries, "id" | "label" | "color">[];
}) {
  if (series.length < 2) return null;
  return (
    <ul className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Legend">
      {series.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center gap-2 text-[12px] font-semibold text-fg-muted"
        >
          <span
            aria-hidden="true"
            className="h-[3px] w-3.5 rounded-full"
            style={{ background: entry.color }}
          />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}

export function LineChart({
  series,
  xLabels,
  ariaLabel,
  height = 240,
  formatValue = String,
  faded = false,
}: LineChartProps) {
  const id = useId();
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const count = xLabels.length;
  const max = useMemo(() => Math.max(0, ...series.flatMap((entry) => [...entry.values])), [series]);
  const ticks = useMemo(() => niceTicks(max), [max]);
  const top = ticks[ticks.length - 1] ?? 1;
  const innerWidth = Math.max(10, width - margin.left - margin.right);
  const innerHeight = height - margin.top - margin.bottom;
  const x = linearScale([0, Math.max(1, count - 1)], [margin.left, margin.left + innerWidth]);
  const y = linearScale([0, top], [margin.top + innerHeight, margin.top]);
  const xs = useMemo(() => xLabels.map((_label, index) => x(index)), [xLabels, x]);

  const tickStep = Math.max(1, Math.ceil(count / Math.max(2, Math.floor(innerWidth / 92))));

  const paths = series.map((entry) => {
    const points = entry.values.map((value, index) => ({ x: x(index), y: y(value) }));
    return { entry, points, line: monotonePath(points) };
  });
  const first = paths[0];

  const handleMove = (event: PointerEvent<SVGRectElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setActive(nearestIndex(event.clientX - rect.left + margin.left, xs));
  };

  return (
    <div
      ref={ref}
      className="relative w-full select-none transition-opacity duration-200"
      style={{ height, opacity: faded ? 0.55 : 1 }}
    >
      <svg
        width={width}
        height={height}
        role="group"
        aria-label={ariaLabel}
        className="block overflow-visible"
      >
        <defs>
          <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0"
              stopColor={first?.entry.color ?? "var(--chart-1)"}
              stopOpacity="0.22"
            />
            <stop offset="1" stopColor={first?.entry.color ?? "var(--chart-1)"} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick} transform={`translate(0 ${y(tick)})`}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              stroke="var(--chart-grid)"
              strokeWidth={1}
            />
            <text
              x={margin.left - 8}
              y={4}
              textAnchor="end"
              className="type-mono fill-[var(--chart-axis)] text-[10px]"
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}
        {xLabels.map((label, index) =>
          (count - 1 - index) % tickStep === 0 ? (
            <text
              key={`${label}-${index}`}
              x={x(index)}
              y={height - 6}
              textAnchor={index === count - 1 ? "end" : index === 0 ? "start" : "middle"}
              className="type-mono fill-[var(--chart-axis)] text-[10px]"
            >
              {label}
            </text>
          ) : null,
        )}
        {first && first.points.length > 1 ? (
          <path
            d={areaPathFrom(first.points, margin.top + innerHeight)}
            fill={`url(#${id}-wash)`}
          />
        ) : null}
        {paths.map(({ entry, line }) => (
          <path
            key={entry.id}
            d={line}
            fill="none"
            stroke={entry.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        {active !== null ? (
          <line
            x1={xs[active]}
            x2={xs[active]}
            y1={margin.top}
            y2={margin.top + innerHeight}
            stroke="var(--chart-grid-strong)"
            strokeWidth={1}
          />
        ) : null}
        {paths.map(({ entry, points }) => {
          const index = active ?? points.length - 1;
          const point = points[index];
          if (!point) return null;
          return (
            <circle
              key={entry.id}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={entry.color}
              stroke="var(--jm-surface-1)"
              strokeWidth={2}
            />
          );
        })}
        <rect
          x={margin.left}
          y={margin.top}
          width={innerWidth}
          height={innerHeight}
          fill="transparent"
          tabIndex={0}
          aria-label={ariaLabel}
          onPointerMove={handleMove}
          onPointerEnter={handleMove}
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive(count - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft")
              setActive((current) => Math.max(0, (current ?? count - 1) - 1));
            if (event.key === "ArrowRight")
              setActive((current) => Math.min(count - 1, (current ?? count - 1) + 1));
          }}
          className="outline-none"
        />
      </svg>
      <ChartTooltip
        visible={active !== null}
        x={active === null ? 0 : (xs[active] ?? 0)}
        containerWidth={width}
        title={active === null ? "" : (xLabels[active] ?? "")}
        rows={
          active === null
            ? []
            : series.map((entry) => ({
                key: entry.id,
                color: entry.color,
                name: entry.label,
                value: formatValue(entry.values[active] ?? 0),
              }))
        }
      />
    </div>
  );
}
