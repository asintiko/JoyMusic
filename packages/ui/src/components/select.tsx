import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";
import { Field, controlInvalidClasses, controlShellClasses, describedBy, useFieldIds } from "./field";

export interface SelectProps extends Omit<ComponentProps<"select">, "size"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
  size?: "md" | "lg";
  wrapperClassName?: string;
}

export function Select({
  label,
  hint,
  error,
  invalid,
  size = "md",
  id,
  required,
  disabled,
  className,
  wrapperClassName,
  children,
  ...rest
}: SelectProps) {
  const ids = useFieldIds(id);
  const isInvalid = invalid ?? Boolean(error);
  return (
    <Field ids={ids} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <div
        className={cx(
          controlShellClasses,
          "relative",
          isInvalid && controlInvalidClasses,
          disabled && "pointer-events-none opacity-50",
          size === "lg" ? "h-12" : "h-10",
        )}
      >
        <select
          id={ids.controlId}
          required={required}
          disabled={disabled}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy(ids, { hint, error })}
          className={cx(
            "h-full min-w-0 flex-1 appearance-none bg-transparent pl-3 pr-9 font-sans font-medium text-fg outline-none",
            size === "lg" ? "text-[16px]" : "text-[14px]",
            className,
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 size-4 text-fg-subtle transition-transform group-focus-within/control:translate-y-px"
        />
      </div>
    </Field>
  );
}
