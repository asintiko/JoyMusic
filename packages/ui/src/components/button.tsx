import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg" | "xl";

export interface ButtonProps extends ComponentProps<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-gradient-strong text-on-brand shadow-[inset_0_1px_0_rgb(255_255_255/0.22),var(--jm-shadow-2)] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.28),var(--jm-glow-brand)] hover:brightness-[1.08]",
  secondary:
    "bg-surface-3 text-fg hairline-strong hover:bg-surface-4 shadow-[var(--jm-shadow-1)]",
  ghost: "bg-transparent text-fg-muted hover:bg-surface-2 hover:text-fg",
  danger:
    "bg-danger text-on-danger shadow-[inset_0_1px_0_rgb(255_255_255/0.2),var(--jm-shadow-1)] hover:brightness-110",
};

export const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-sm px-3 text-[13px]",
  md: "h-10 gap-2 rounded-md px-4 text-[14px]",
  lg: "h-12 gap-2 rounded-lg px-5 text-[15px]",
  xl: "h-14 gap-2.5 rounded-lg px-6 text-[16px]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const spinnerSize = size === "sm" ? 14 : size === "xl" ? 20 : 16;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={cx(
        "focus-ring relative inline-flex select-none items-center justify-center whitespace-nowrap font-sans font-bold tracking-[-0.005em]",
        "transition-[transform,background-color,box-shadow,color,opacity,filter] duration-150 ease-out active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-45",
        buttonSizeClasses[size],
        buttonVariantClasses[variant],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size={spinnerSize} />
        </span>
      ) : null}
      <span className={cx("inline-flex items-center justify-center gap-[inherit]", loading && "invisible")}>
        {leftIcon ? <span className="-ml-0.5 inline-flex shrink-0">{leftIcon}</span> : null}
        {children}
        {rightIcon ? <span className="-mr-0.5 inline-flex shrink-0">{rightIcon}</span> : null}
      </span>
    </button>
  );
}
