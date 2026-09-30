import { useLayoutEffect, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";
import { Field, controlInvalidClasses, controlShellClasses, describedBy, useFieldIds } from "./field";

export interface TextareaProps extends ComponentProps<"textarea"> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  invalid?: boolean;
  autoGrow?: boolean;
  maxRows?: number;
  showCount?: boolean;
  wrapperClassName?: string;
}

export function Textarea({
  label,
  hint,
  error,
  invalid,
  autoGrow = false,
  maxRows = 8,
  showCount = false,
  id,
  required,
  disabled,
  className,
  wrapperClassName,
  value,
  defaultValue,
  maxLength,
  onChange,
  rows = 3,
  ...rest
}: TextareaProps) {
  const ids = useFieldIds(id);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const isInvalid = invalid ?? Boolean(error);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !autoGrow) return;
    element.style.height = "auto";
    const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight) || 21;
    const limit = lineHeight * maxRows + 20;
    element.style.height = `${Math.min(element.scrollHeight, limit)}px`;
  }, [value, autoGrow, maxRows]);

  const length = typeof value === "string" ? value.length : undefined;

  return (
    <Field ids={ids} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
      <div
        className={cx(
          controlShellClasses,
          "items-stretch px-3 py-2.5",
          isInvalid && controlInvalidClasses,
          disabled && "pointer-events-none opacity-50",
        )}
      >
        <textarea
          ref={ref}
          id={ids.controlId}
          rows={rows}
          required={required}
          disabled={disabled}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          onChange={onChange}
          aria-invalid={isInvalid || undefined}
          aria-describedby={describedBy(ids, { hint, error })}
          className={cx(
            "min-h-[4.5rem] w-full flex-1 resize-none bg-transparent font-sans text-[14px] font-medium leading-[1.5] text-fg outline-none placeholder:text-fg-subtle",
            className,
          )}
          {...rest}
        />
      </div>
      {showCount && maxLength && length !== undefined ? (
        <span className="type-mono self-end text-fg-subtle" aria-hidden="true">
          {length}/{maxLength}
        </span>
      ) : null}
    </Field>
  );
}
