import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";

export type BadgeTone = "neutral" | "brand" | "playing" | "next" | "danger" | "success" | "info";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends ComponentProps<"span"> {
  tone?: BadgeTone;
  size?: BadgeSize;
  dot?: boolean;
  icon?: ReactNode;
}

export const badgeToneClasses: Record<BadgeTone, string> = {
  neutral: "bg-surface-3 text-fg-muted",
  brand: "bg-brand-soft text-brand",
  playing: "bg-playing-soft text-playing-fg",
  next: "bg-next-soft text-next-fg",
  danger: "bg-danger-soft text-danger-fg",
  success: "bg-success-soft text-success-fg",
  info: "bg-info-soft text-info-fg",
};

export const badgeDotClasses: Record<BadgeTone, string> = {
  neutral: "bg-fg-subtle",
  brand: "bg-brand",
  playing: "bg-playing",
  next: "bg-next",
  danger: "bg-danger",
  success: "bg-success",
  info: "bg-info",
};

export function Badge({ tone = "neutral", size = "md", dot, icon, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill font-sans font-bold",
        size === "sm" ? "h-5 px-2 text-[11px]" : "h-6 px-2.5 text-[12px]",
        badgeToneClasses[tone],
        className,
      )}
      {...rest}
    >
      {dot ? <span className={cx("size-1.5 rounded-full", badgeDotClasses[tone])} aria-hidden="true" /> : null}
      {icon ? <span className="inline-flex shrink-0 [&>svg]:size-3.5">{icon}</span> : null}
      {children}
    </span>
  );
}
