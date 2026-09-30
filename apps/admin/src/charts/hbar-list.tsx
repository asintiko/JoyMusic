import type { ReactNode } from "react";
import { cx } from "@joymusic/ui";

export interface HBarRow {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  leading?: ReactNode;
  secondary?: string;
}

export interface HBarListProps {
  rows: readonly HBarRow[];
  formatValue?: (value: number) => string;
  ariaLabel: string;
  numbered?: boolean;
  compact?: boolean;
}

export function HBarList({
  rows,
  formatValue = String,
  ariaLabel,
  numbered = false,
  compact = false,
}: HBarListProps) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ol aria-label={ariaLabel} className="flex flex-col">
      {rows.map((row, index) => (
        <li
          key={row.key}
          className={cx(
            "group/row flex items-center gap-3 rounded-md px-1.5 transition-colors hover:bg-surface-2",
            compact ? "py-1.5" : "py-2",
          )}
        >
          {numbered ? (
            <span className="type-mono w-4 shrink-0 text-right text-[11px] text-fg-disabled">
              {index + 1}
            </span>
          ) : null}
          {row.leading}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="min-w-0 truncate text-[13px] font-bold leading-tight">{row.label}</p>
              <p className="type-mono shrink-0 text-[12.5px] font-bold text-fg">
                {formatValue(row.value)}
              </p>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div
                  className="h-full rounded-full transition-[width] duration-500 ease-out"
                  style={{
                    width: `${Math.max(row.value > 0 ? 3 : 0, (row.value / max) * 100)}%`,
                    background: index === 0 ? "var(--jm-brand-from)" : "var(--chart-1)",
                    backgroundImage:
                      index === 0
                        ? "linear-gradient(90deg, var(--jm-brand-from), var(--jm-brand-to))"
                        : undefined,
                  }}
                />
              </div>
            </div>
            {row.sublabel || row.secondary ? (
              <div className="mt-0.5 flex items-center justify-between gap-3 text-[11.5px] text-fg-subtle">
                <span className="truncate">{row.sublabel}</span>
                <span className="type-mono shrink-0">{row.secondary}</span>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
