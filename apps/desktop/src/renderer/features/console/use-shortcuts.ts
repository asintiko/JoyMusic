import { useEffect, useRef } from "react";
import { intentForKey } from "./intents";
import type { ConsoleIntent } from "./intents";

const interactiveSelector =
  "input, textarea, select, [contenteditable='true'], [role='dialog'], [role='combobox']";
const activatorSelector = "button, a[href], [role='button'], [role='switch'], [role='tab']";

export function shouldIgnoreTarget(target: EventTarget | null, key: string): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(interactiveSelector)) return true;
  if ((key === " " || key === "Enter") && target.closest(activatorSelector)) return true;
  return false;
}

export function useConsoleShortcuts(
  perform: (intent: ConsoleIntent) => void,
  enabled: boolean,
): void {
  const performRef = useRef(perform);
  performRef.current = perform;
  useEffect(() => {
    if (!enabled) return undefined;
    const listener = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat) return;
      const intent = intentForKey(event);
      if (!intent) return;
      if (shouldIgnoreTarget(event.target, event.key)) return;
      event.preventDefault();
      performRef.current(intent);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled]);
}
