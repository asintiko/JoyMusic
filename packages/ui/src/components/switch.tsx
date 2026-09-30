import { useId, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";

export interface SwitchProps
  extends Omit<ComponentProps<"button">, "onChange" | "role" | "aria-checked" | "children" | "value"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  size?: "md" | "lg";
}

export function Switch({
  checked,
  defaultChecked = false,
  onCheckedChange,
  label,
  description,
  size = "md",
  disabled,
  className,
  id,
  ...rest
}: SwitchProps) {
  const generated = useId();
  const controlId = id ?? generated;
  const labelId = `${controlId}-label`;
  const descriptionId = `${controlId}-description`;
  const [internal, setInternal] = useState(defaultChecked);
  const isControlled = checked !== undefined;
  const isOn = isControlled ? checked : internal;

  const toggle = () => {
    const next = !isOn;
    if (!isControlled) setInternal(next);
    onCheckedChange?.(next);
  };

  const track = size === "lg" ? "h-8 w-14" : "h-6 w-11";
  const thumb = size === "lg" ? "size-6" : "size-[18px]";
  const travel = size === "lg" ? "translate-x-6" : "translate-x-5";

  const control = (
    <button
      id={controlId}
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-labelledby={label ? labelId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      disabled={disabled}
      onClick={toggle}
      className={cx(
        "focus-ring relative inline-flex shrink-0 items-center rounded-pill p-[3px] transition-[background-color,box-shadow] duration-200 ease-out",
        "disabled:pointer-events-none disabled:opacity-45",
        track,
        isOn
          ? "bg-brand-gradient-strong shadow-[inset_0_1px_0_rgb(255_255_255/0.2),var(--jm-shadow-1)]"
          : "bg-surface-4 shadow-[inset_0_0_0_1px_var(--jm-line-strong)]",
        className,
      )}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cx(
          "block rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.35)] transition-transform duration-300 [transition-timing-function:var(--jm-ease-spring)]",
          thumb,
          isOn ? travel : "translate-x-0",
        )}
      />
    </button>
  );

  if (!label && !description) return control;

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {label ? (
          <span id={labelId} className="type-body block font-semibold text-fg">
            {label}
          </span>
        ) : null}
        {description ? (
          <span id={descriptionId} className="type-body-sm mt-0.5 block text-fg-muted">
            {description}
          </span>
        ) : null}
      </div>
      {control}
    </div>
  );
}
