import type { ComponentProps } from "react";
import { cx } from "../lib/cx";

export type CardVariant = "flat" | "raised" | "glass" | "outline" | "brand";
export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps extends ComponentProps<"div"> {
  variant?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  flat: "bg-surface-1 hairline",
  raised: "bg-surface-2 hairline shadow-2",
  glass: "jm-glass",
  outline: "bg-transparent hairline-strong",
  brand:
    "bg-surface-1 shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--jm-brand)_35%,transparent),var(--jm-glow-soft)]",
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

export function Card({
  variant = "flat",
  padding = "md",
  interactive = false,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cx(
        "relative rounded-lg text-fg",
        variantClasses[variant],
        paddingClasses[padding],
        interactive &&
          "focus-ring cursor-pointer transition-[transform,background-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:bg-surface-2 active:translate-y-0",
        className,
      )}
      {...rest}
    />
  );
}

export function CardTitle({ className, ...rest }: ComponentProps<"h3">) {
  return <h3 className={cx("type-title-sm text-fg", className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: ComponentProps<"p">) {
  return <p className={cx("type-body-sm text-fg-muted", className)} {...rest} />;
}
