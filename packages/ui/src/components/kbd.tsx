import { ArrowBigUp, Command, CornerDownLeft, Option } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { useEffect, useState } from "react";
import { isApplePlatform } from "../hooks/use-hotkey";
import { cx } from "../lib/cx";

export function Kbd({ className, children, ...rest }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cx(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-xs bg-surface-3 px-1.5 font-mono text-[11px] font-semibold text-fg-muted",
        "shadow-[inset_0_-1px_0_var(--jm-line-strong),inset_0_0_0_1px_var(--jm-line)] [&_svg]:size-3",
        className,
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}

function renderKey(key: string, apple: boolean): ReactNode {
  switch (key.toLowerCase()) {
    case "mod":
      return apple ? <Command aria-label="Command" /> : "Ctrl";
    case "shift":
      return apple ? <ArrowBigUp aria-label="Shift" /> : "Shift";
    case "alt":
      return apple ? <Option aria-label="Option" /> : "Alt";
    case "enter":
      return <CornerDownLeft aria-label="Enter" />;
    case "esc":
      return "Esc";
    default:
      return key.length === 1 ? key.toUpperCase() : key;
  }
}

export interface ShortcutProps extends ComponentProps<"span"> {
  keys: readonly string[];
}

export function Shortcut({ keys, className, ...rest }: ShortcutProps) {
  const [apple, setApple] = useState(false);
  useEffect(() => {
    setApple(isApplePlatform());
  }, []);
  return (
    <span className={cx("inline-flex items-center gap-1", className)} {...rest}>
      {keys.map((key) => (
        <Kbd key={key}>{renderKey(key, apple)}</Kbd>
      ))}
    </span>
  );
}
