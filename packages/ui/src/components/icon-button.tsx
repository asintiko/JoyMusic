import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";
import { Spinner } from "./spinner";

export type IconButtonVariant = "ghost" | "secondary" | "primary" | "glass" | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends Omit<ComponentProps<"button">, "aria-label" | "children"> {
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  pressed?: boolean;
}

const variantClasses: Record<IconButtonVariant, string> = {
  ghost: "bg-transparent text-fg-muted hover:bg-surface-3 hover:text-fg",
  secondary: "bg-surface-3 text-fg hairline-strong hover:bg-surface-4",
  primary:
    "bg-brand-gradient-strong text-on-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.22),var(--jm-shadow-2)] hover:shadow-[var(--jm-glow-brand)] hover:brightness-110",
  glass: "jm-glass text-fg hover:brightness-125",
  danger: "bg-danger-soft text-danger-fg hover:bg-danger hover:text-on-danger",
};

const sizeClasses: Record<IconButtonSize, string> = {
  sm: "size-8 rounded-sm",
  md: "size-10 rounded-md",
  lg: "size-12 rounded-lg",
};

export function IconButton({
  label,
  icon,
  variant = "ghost",
  size = "md",
  loading = false,
  pressed,
  disabled,
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      aria-pressed={pressed}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cx(
        "focus-ring inline-flex shrink-0 select-none items-center justify-center",
        "transition-[transform,background-color,color,box-shadow,filter] duration-150 ease-out active:scale-95",
        "disabled:pointer-events-none disabled:opacity-45",
        pressed && "bg-surface-4 text-fg",
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner size={size === "sm" ? 14 : 18} /> : icon}
    </button>
  );
}
