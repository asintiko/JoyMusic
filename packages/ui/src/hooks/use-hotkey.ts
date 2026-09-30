import { useEffect, useRef } from "react";

export interface HotkeyOptions {
  mod?: boolean;
  shift?: boolean;
  alt?: boolean;
  allowInInputs?: boolean;
  enabled?: boolean;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function useHotkey(key: string, handler: (event: KeyboardEvent) => void, options: HotkeyOptions = {}): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  const { mod = false, shift = false, alt = false, allowInInputs = false, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return undefined;
    const listener = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      const modPressed = event.metaKey || event.ctrlKey;
      if (mod !== modPressed) return;
      if (shift !== event.shiftKey) return;
      if (alt !== event.altKey) return;
      if (!allowInInputs && !mod && isEditable(event.target)) return;
      handlerRef.current(event);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [key, mod, shift, alt, allowInInputs, enabled]);
}

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.platform || navigator.userAgent);
}
