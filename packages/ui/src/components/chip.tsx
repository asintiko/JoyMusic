import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";

export type ChipTone = "default" | "brand" | "outline";

export interface ChipProps extends Omit<ComponentProps<"button">, "children"> {
  selected?: boolean;
  tone?: ChipTone;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  count?: number;
  children: ReactNode;
}

const sizeClasses = {
  sm: "h-7 gap-1.5 px-3 text-[12px] [&_svg]:size-3.5",
  md: "h-9 gap-2 px-4 text-[13px] [&_svg]:size-4",
  lg: "h-11 gap-2 px-5 text-[14px] [&_svg]:size-[18px]",
} as const;

export function Chip({
  selected,
  tone = "default",
  size = "md",
  icon,
  count,
  className,
  children,
  type = "button",
  ...rest
}: ChipProps) {
  const isToggle = selected !== undefined;
  const active = Boolean(selected);
  return (
    <button
      type={type}
      aria-pressed={isToggle ? active : undefined}
      data-selected={active || undefined}
      className={cx(
        "focus-ring inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap rounded-pill font-sans font-bold",
        "transition-[background-color,color,box-shadow,transform] duration-150 ease-out active:scale-[0.97]",
        "disabled:pointer-events-none disabled:opacity-45",
        sizeClasses[size],
        active
          ? tone === "brand"
            ? "bg-brand-gradient-strong text-on-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]"
            : "bg-fg text-fg-inverse"
          : tone === "outline"
            ? "bg-transparent text-fg-muted shadow-[inset_0_0_0_1px_var(--jm-line-strong)] hover:bg-surface-2 hover:text-fg"
            : tone === "brand"
              ? "bg-brand-soft text-brand hover:bg-surface-3"
              : "bg-surface-2 text-fg-muted shadow-[inset_0_0_0_1px_var(--jm-line)] hover:bg-surface-3 hover:text-fg",
        className,
      )}
      {...rest}
    >
      {icon ? <span className="inline-flex shrink-0">{icon}</span> : null}
      {children}
      {count !== undefined ? (
        <span className={cx("type-mono text-[11px]", active ? "opacity-70" : "text-fg-subtle")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

export interface ChipRowProps extends ComponentProps<"div"> {
  fade?: boolean;
  bleed?: boolean;
}

export function ChipRow({ fade = true, bleed = true, className, children, ...rest }: ChipRowProps) {
  return (
    <div
      role="group"
      data-fade={fade || undefined}
      className={cx(
        "jm-chip-row scrollbar-none flex items-center gap-2 overflow-x-auto py-1",
        bleed && "-mx-4 px-4",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
