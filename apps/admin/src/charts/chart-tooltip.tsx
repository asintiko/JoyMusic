import type { ReactNode } from "react";
import { cx } from "@joymusic/ui";

export interface TooltipRow {
  key: string;
  color: string;
  name: string;
  value: string;
}

export interface ChartTooltipProps {
  x: number;
  y?: number;
  containerWidth: number;
  title: ReactNode;
  rows: readonly TooltipRow[];
  visible: boolean;
}

export function ChartTooltip({
  x,
  y = 8,
  containerWidth,
  title,
  rows,
  visible,
}: ChartTooltipProps) {
  const flip = x > containerWidth * 0.62;
  return (
    <div
      role="presentation"
      className={cx(
        "pointer-events-none absolute z-raised min-w-[132px] rounded-md bg-surface-4 px-3 py-2 shadow-[var(--jm-shadow-3)] hairline-strong transition-opacity duration-100",
        visible ? "opacity-100" : "opacity-0",
      )}
      style={{
        left: flip ? undefined : x + 14,
        right: flip ? Math.max(0, containerWidth - x + 14) : undefined,
        top: y,
      }}
    >
      <p className="mb-1.5 text-[11px] font-semibold text-fg-subtle">{title}</p>
      <ul className="flex flex-col gap-1">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-[3px] w-3 rounded-full"
              style={{ background: row.color }}
            />
            <span className="type-mono text-[13px] font-bold text-fg">{row.value}</span>
            <span className="text-[12px] text-fg-muted">{row.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
