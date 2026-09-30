import { useSyncExternalStore } from "react";

const subscribeNever = () => () => undefined;

export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}
