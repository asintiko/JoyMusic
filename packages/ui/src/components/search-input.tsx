import { Search, X } from "lucide-react";
import { useRef } from "react";
import type { ComponentProps, ReactNode } from "react";
import { cx } from "../lib/cx";
import { Spinner } from "./spinner";

export interface SearchInputProps extends Omit<
  ComponentProps<"input">,
  "size" | "value" | "onChange" | "type" | "defaultValue"
> {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
  onSearch?: (value: string) => void;
  loading?: boolean;
  clearLabel?: string;
  loadingLabel?: string;
  size?: "md" | "lg";
  shortcut?: ReactNode;
  wrapperClassName?: string;
}

export function SearchInput({
  value,
  onValueChange,
  onClear,
  onSearch,
  loading = false,
  clearLabel = "Clear search",
  loadingLabel = "Searching",
  size = "md",
  shortcut,
  className,
  wrapperClassName,
  onKeyDown,
  disabled,
  ...rest
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasValue = value.length > 0;

  const clear = () => {
    onValueChange("");
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div
      role="search"
      className={cx(
        "group/search flex w-full items-center gap-2.5 rounded-pill bg-surface-2 text-fg transition-[box-shadow,background-color] duration-150 ease-out",
        "shadow-[inset_0_0_0_1px_var(--jm-line)] hover:bg-surface-3 focus-within:bg-surface-2 focus-within:shadow-[inset_0_0_0_1.5px_var(--jm-focus),var(--jm-glow-soft)]",
        size === "lg" ? "h-13 pl-4 pr-2" : "h-10 pl-3.5 pr-1.5",
        disabled && "pointer-events-none opacity-50",
        wrapperClassName,
      )}
    >
      <Search
        aria-hidden="true"
        className={cx("shrink-0 text-fg-subtle", size === "lg" ? "size-5" : "size-4")}
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        disabled={disabled}
        enterKeyHint="search"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.defaultPrevented) return;
          if (event.key === "Enter") onSearch?.(value);
          if (event.key === "Escape" && hasValue) {
            event.preventDefault();
            clear();
          }
        }}
        className={cx(
          "min-w-0 flex-1 bg-transparent font-sans font-semibold text-fg outline-none placeholder:font-medium placeholder:text-fg-subtle",
          size === "lg" ? "text-[16px]" : "text-[14px]",
          className,
        )}
        {...rest}
      />
      {loading ? (
        <Spinner size={size === "lg" ? 20 : 16} label={loadingLabel} className="text-fg-subtle" />
      ) : null}
      {shortcut && !hasValue ? (
        <span className="hidden shrink-0 sm:inline-flex">{shortcut}</span>
      ) : null}
      {hasValue ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={clear}
          className={cx(
            "focus-ring inline-flex shrink-0 items-center justify-center rounded-full bg-surface-4 text-fg-muted transition-colors hover:bg-surface-5 hover:text-fg",
            size === "lg" ? "size-9" : "size-7",
          )}
        >
          <X aria-hidden="true" className={size === "lg" ? "size-4" : "size-3.5"} />
        </button>
      ) : null}
    </div>
  );
}
