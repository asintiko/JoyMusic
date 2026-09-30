import { Check, Minus } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";

export interface CheckboxProps extends Omit<ComponentProps<"input">, "type" | "size"> {
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
}

export function Checkbox({
  label,
  description,
  indeterminate = false,
  className,
  id,
  disabled,
  ...rest
}: CheckboxProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div className={cx("flex items-start gap-3", disabled && "opacity-50", className)}>
      <span className="relative mt-0.5 inline-flex size-5 shrink-0">
        <input
          ref={ref}
          id={controlId}
          type="checkbox"
          disabled={disabled}
          aria-describedby={description ? `${controlId}-description` : undefined}
          className={cx(
            "peer focus-ring size-5 appearance-none rounded-xs bg-surface-2 shadow-[inset_0_0_0_1.5px_var(--jm-line-strong)] transition-[background-color,box-shadow] duration-150",
            "hover:bg-surface-3 checked:bg-brand-gradient-strong checked:shadow-[inset_0_1px_0_rgb(255_255_255/0.22)]",
            "indeterminate:bg-brand-gradient-strong indeterminate:shadow-[inset_0_1px_0_rgb(255_255_255/0.22)]",
            "disabled:cursor-not-allowed",
          )}
          {...rest}
        />
        <Check
          aria-hidden="true"
          strokeWidth={3.2}
          className="pointer-events-none absolute inset-0 m-auto size-3.5 scale-50 text-on-brand opacity-0 transition-[opacity,transform] duration-150 peer-checked:scale-100 peer-checked:opacity-100 peer-indeterminate:hidden"
        />
        <Minus
          aria-hidden="true"
          strokeWidth={3.2}
          className="pointer-events-none absolute inset-0 m-auto hidden size-3.5 text-on-brand peer-indeterminate:block"
        />
      </span>
      {label || description ? (
        <label htmlFor={controlId} className="min-w-0 cursor-pointer select-none">
          {label ? <span className="type-body block font-semibold text-fg">{label}</span> : null}
          {description ? (
            <span id={`${controlId}-description`} className="type-body-sm block text-fg-muted">
              {description}
            </span>
          ) : null}
        </label>
      ) : null}
    </div>
  );
}
