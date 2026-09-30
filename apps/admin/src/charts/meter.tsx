import { AlertTriangle, CheckCircle2, OctagonAlert } from "lucide-react";
import { declineSeverity } from "../lib/chart-data";

const severityStyle = {
  ok: { fill: "var(--jm-brand-from)", Icon: CheckCircle2, tone: "text-success-fg" },
  warning: { fill: "var(--jm-next)", Icon: AlertTriangle, tone: "text-next-fg" },
  critical: { fill: "var(--jm-danger)", Icon: OctagonAlert, tone: "text-danger-fg" },
} as const;

export interface MeterProps {
  fraction: number;
  valueLabel: string;
  statusLabel: string;
  ariaLabel: string;
}

export function DeclineMeter({ fraction, valueLabel, statusLabel, ariaLabel }: MeterProps) {
  const severity = declineSeverity(fraction);
  const style = severityStyle[severity];
  const percent = Math.min(100, Math.max(0, fraction * 100));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <p className="type-mono-lg text-[34px] font-bold leading-none">{valueLabel}</p>
        <p className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${style.tone}`}>
          <style.Icon aria-hidden="true" className="size-4" />
          {statusLabel}
        </p>
      </div>
      <div
        role="meter"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
        className="relative h-3 overflow-hidden rounded-full"
        style={{ background: `color-mix(in oklab, ${style.fill} 18%, var(--jm-surface-3))` }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${Math.max(percent > 0 ? 2 : 0, percent)}%`, background: style.fill }}
        />
      </div>
      <div className="type-mono flex justify-between text-[10px] text-fg-subtle">
        <span>0%</span>
        <span>12%</span>
        <span>25%</span>
        <span>50%+</span>
      </div>
    </div>
  );
}
