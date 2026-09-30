import { useEffect, useRef } from "react";

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function useChord(
  leader: string,
  handlers: Record<string, () => void>,
  enabled = true,
  timeoutMs = 1200,
): void {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  useEffect(() => {
    if (!enabled) return undefined;
    let armedAt = 0;
    const listener = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditable(event.target)) return;
      const key = event.key.toLowerCase();
      if (armedAt && Date.now() - armedAt < timeoutMs) {
        armedAt = 0;
        const handler = handlersRef.current[key];
        if (handler) {
          event.preventDefault();
          handler();
        }
        return;
      }
      armedAt = key === leader ? Date.now() : 0;
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [leader, enabled, timeoutMs]);
}

export function useSingleKey(key: string, handler: () => void, enabled = true): void {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;
  useEffect(() => {
    if (!enabled) return undefined;
    const listener = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isEditable(event.target)) return;
      if (event.key === key) {
        event.preventDefault();
        handlerRef.current();
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [key, enabled]);
}
