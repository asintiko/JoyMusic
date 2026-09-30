import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import { Sparkline } from "./sparkline";
import type { SparklineProps } from "./sparkline";

export interface MetricProps {
  label: string;
  value: string;
  delta?: string;
  trend?: "up" | "down" | "flat";
  goodWhen?: "up" | "down";
  icon?: ReactNode;
  spark?: readonly number[];
  sparkTone?: SparklineProps["tone"];
  className?: string;
}

export function Metric({
  label,
  value,
  delta,
  trend = "flat",
  goodWhen = "up",
  icon,
  spark,
  sparkTone = "brand",
  className,
}: MetricProps) {
  const good = trend === "flat" ? null : trend === goodWhen;
  return (
    <div
      className={cx(
        "relative flex flex-col gap-3 overflow-hidden rounded-lg bg-surface-1 p-4 hairline",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="type-eyebrow text-fg-subtle">{label}</span>
        {icon ? <span className="text-fg-subtle [&>svg]:size-4">{icon}</span> : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="type-mono-lg text-[30px] font-bold text-fg">{value}</p>
          {delta ? (
            <p
              className={cx(
                "mt-1.5 inline-flex items-center gap-1 text-[12px] font-bold",
                good === null ? "text-fg-subtle" : good ? "text-success-fg" : "text-danger-fg",
              )}
            >
              {trend === "up" ? (
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              ) : trend === "down" ? (
                <ArrowDownRight aria-hidden="true" className="size-3.5" />
              ) : null}
              {delta}
            </p>
          ) : null}
        </div>
        {spark ? <Sparkline values={spark} tone={sparkTone} width={112} height={40} /> : null}
      </div>
    </div>
  );
}
