import { useId, useMemo, useState } from "react";
import { linearScale, niceTicks, peakOf } from "../lib/chart-data";
import { ChartTooltip } from "./chart-tooltip";
import { useElementWidth } from "./use-size";

export interface BarDatum {
  label: string;
  value: number;
  caption?: string;
}

export interface BarChartProps {
  data: readonly BarDatum[];
  seriesName: string;
  ariaLabel: string;
  height?: number;
  tickEvery?: number;
  formatValue?: (value: number) => string;
  highlightPeak?: boolean;
  faded?: boolean;
}

const margin = { top: 22, right: 8, bottom: 24, left: 34 };
const maxBar = 24;

function roundedTop(x: number, y: number, width: number, height: number, radius: number): string {
  const r = Math.min(radius, width / 2, height);
  if (height <= 0) return "";
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`;
}

export function BarChart({
  data,
  seriesName,
  ariaLabel,
  height = 240,
  tickEvery = 3,
  formatValue = String,
  highlightPeak = true,
  faded = false,
}: BarChartProps) {
  const id = useId();
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const values = useMemo(() => data.map((entry) => entry.value), [data]);
  const max = Math.max(0, ...values);
  const ticks = useMemo(() => niceTicks(max), [max]);
  const top = ticks[ticks.length - 1] ?? 1;
  const peak = highlightPeak ? peakOf(values) : null;

  const innerWidth = Math.max(10, width - margin.left - margin.right);
  const innerHeight = height - margin.top - margin.bottom;
  const band = innerWidth / Math.max(1, data.length);
  const barWidth = Math.max(3, Math.min(maxBar, band - 4));
  const y = linearScale([0, top], [innerHeight, 0]);
  const centerOf = (index: number) => margin.left + band * index + band / 2;
  const activeDatum = active === null ? null : data[active];

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
          <linearGradient id={`${id}-peak`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--jm-brand-to)" />
            <stop offset="1" stopColor="var(--jm-brand-from)" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick} transform={`translate(0 ${margin.top + y(tick)})`}>
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
        {data.map((entry, index) => {
          const barHeight = Math.max(entry.value > 0 ? 2 : 0, innerHeight - y(entry.value));
          const x = centerOf(index) - barWidth / 2;
          const isPeak = peak?.index === index;
          const isActive = active === index;
          return (
            <g key={entry.label}>
              <path
                d={roundedTop(x, margin.top + innerHeight - barHeight, barWidth, barHeight, 4)}
                fill={isPeak ? `url(#${id}-peak)` : "var(--chart-1)"}
                opacity={active === null || isActive ? 1 : 0.55}
                style={{ transition: "opacity 120ms" }}
              />
              {entry.value === 0 ? (
                <rect
                  x={x}
                  y={margin.top + innerHeight - 2}
                  width={barWidth}
                  height={2}
                  rx={1}
                  fill="var(--chart-grid-strong)"
                />
              ) : null}
              {index % tickEvery === 0 ? (
                <text
                  x={centerOf(index)}
                  y={height - 6}
                  textAnchor="middle"
                  className="type-mono fill-[var(--chart-axis)] text-[10px]"
                >
                  {entry.label}
                </text>
              ) : null}
              <rect
                x={margin.left + band * index}
                y={margin.top}
                width={band}
                height={innerHeight}
                fill="transparent"
                tabIndex={0}
                role="img"
                aria-label={`${entry.caption ?? entry.label}: ${formatValue(entry.value)} ${seriesName}`}
                onPointerEnter={() => setActive(index)}
                onPointerMove={() => setActive(index)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(index)}
                onBlur={() => setActive(null)}
                className="outline-none focus-visible:stroke-[var(--jm-focus)] focus-visible:[stroke-width:2]"
              />
            </g>
          );
        })}
        {peak && active === null ? (
          <text
            x={centerOf(peak.index)}
            y={margin.top + y(peak.value) - 8}
            textAnchor="middle"
            className="type-mono fill-[var(--jm-fg)] text-[11px] font-bold"
          >
            {formatValue(peak.value)}
          </text>
        ) : null}
      </svg>
      <ChartTooltip
        visible={activeDatum !== null && active !== null}
        x={active === null ? 0 : centerOf(active)}
        y={4}
        containerWidth={width}
        title={activeDatum?.caption ?? activeDatum?.label ?? ""}
        rows={
          activeDatum
            ? [
                {
                  key: "v",
                  color: "var(--chart-1)",
                  name: seriesName,
                  value: formatValue(activeDatum.value),
                },
              ]
            : []
        }
      />
    </div>
  );
}
