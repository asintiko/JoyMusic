import { useCallback, useState } from "react";
import { useHotkey } from "./use-hotkey";

export interface CommandPaletteControls {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export function useCommandPalette(enabled = true): CommandPaletteControls {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((value) => !value), []);
  useHotkey(
    "k",
    (event) => {
      event.preventDefault();
      toggle();
    },
    { mod: true, allowInInputs: true, enabled },
  );
  return { open, setOpen, toggle };
}
