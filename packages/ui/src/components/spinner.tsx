import type { ComponentProps } from "react";
import { cx } from "../lib/cx";

export interface SpinnerProps extends Omit<ComponentProps<"span">, "children"> {
  size?: number;
  label?: string;
}

export function Spinner({ size = 18, label, className, style, ...rest }: SpinnerProps) {
  const labelled = label !== undefined && label !== "";
  return (
    <span
      role={labelled ? "status" : undefined}
      aria-label={labelled ? label : undefined}
      aria-hidden={labelled ? undefined : true}
      className={cx("inline-flex shrink-0 items-center justify-center text-current", className)}
      style={{ width: size, height: size, ...style }}
      {...rest}
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.22" strokeWidth="3" />
        <path
          className="jm-spinner-arc"
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
