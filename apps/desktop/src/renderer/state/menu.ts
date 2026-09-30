import { useEffect, useRef } from "react";
import type { MenuCommand } from "../../common/channels";
import { getBridge } from "../bridge/access";

export type MenuHandlers = Partial<Record<MenuCommand, () => void>>;

export function useMenuCommands(handlers: MenuHandlers): void {
  const ref = useRef(handlers);
  ref.current = handlers;
  useEffect(
    () =>
      getBridge().menu.onCommand((command) => {
        ref.current[command]?.();
      }),
    [],
  );
}
