import { useId } from "react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";

export interface FieldMessages {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export interface FieldIds {
  controlId: string;
  hintId: string;
  errorId: string;
}

export function useFieldIds(explicitId?: string): FieldIds {
  const generated = useId();
  const controlId = explicitId ?? generated;
  return { controlId, hintId: `${controlId}-hint`, errorId: `${controlId}-error` };
}

export function describedBy(ids: FieldIds, messages: FieldMessages, extra?: string): string | undefined {
  const parts = [extra, messages.error ? ids.errorId : undefined, messages.hint ? ids.hintId : undefined].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(" ") : undefined;
}

export interface FieldProps extends FieldMessages {
  ids: FieldIds;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ ids, label, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cx("flex min-w-0 flex-col gap-1.5", className)}>
      {label ? (
        <label htmlFor={ids.controlId} className="type-label text-fg-muted">
          {label}
          {required ? (
            <span className="ml-0.5 text-danger-fg" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p id={ids.errorId} className="type-caption text-danger-fg" role="alert">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={ids.hintId} className="type-caption text-fg-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const controlShellClasses =
  "group/control flex w-full items-center gap-2 rounded-md bg-surface-2 text-fg transition-[box-shadow,background-color] duration-150 ease-out " +
  "shadow-[inset_0_0_0_1px_var(--jm-line)] hover:bg-surface-3 focus-within:bg-surface-2 focus-within:shadow-[inset_0_0_0_1.5px_var(--jm-focus)]";

export const controlInvalidClasses =
  "shadow-[inset_0_0_0_1.5px_var(--jm-danger)] focus-within:shadow-[inset_0_0_0_1.5px_var(--jm-danger)]";
