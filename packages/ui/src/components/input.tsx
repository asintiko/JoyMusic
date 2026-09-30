import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";
import { Field, controlInvalidClasses, controlShellClasses, describedBy, useFieldIds } from "./field";

export interface InputProps extends Omit<ComponentProps<"input">, "size"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  size?: "md" | "lg";
  invalid?: boolean;
  wrapperClassName?: string;
}

export function Input({
  label,
  hint,
  error,
  leading,
  trailing,
  size = "md",
  invalid,
  id,
  required,
  disabled,
  className,
  wrapperClassName,
  ...rest
}: InputProps) {
  const ids = useFieldIds(id);
  const isInvalid = invalid ?? Boolean(error);
  return (
    <Field ids={ids} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <div
        className={cx(
          controlShellClasses,
          isInvalid && controlInvalidClasses,
          disabled && "pointer-events-none opacity-50",
          size === "lg" ? "h-12 px-4" : "h-10 px-3",
        )}
      >
        {leading ? <span className="inline-flex shrink-0 text-fg-subtle [&>svg]:size-[18px]">{leading}</span> : null}
        <input
          id={ids.controlId}
          required={required}
          disabled={disabled}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy(ids, { hint, error })}
          className={cx(
            "min-w-0 flex-1 bg-transparent font-sans font-medium text-fg outline-none placeholder:text-fg-subtle",
            size === "lg" ? "text-[16px]" : "text-[14px]",
            className,
          )}
          {...rest}
        />
        {trailing ? <span className="inline-flex shrink-0 items-center gap-1 text-fg-subtle">{trailing}</span> : null}
      </div>
    </Field>
  );
}
