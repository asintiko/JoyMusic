import { useEffect } from "react";
import { applyTheme } from "@joymusic/ui";
import type { ThemeId } from "@joymusic/ui";
import { useTopic } from "../lib/topics";

export const largeTargetScale = 1.14;

export function useApplyTheme(theme: ThemeId): void {
  const settings = useTopic("settings");
  const booth = settings.boothMode;
  useEffect(() => {
    const effective: ThemeId = booth && theme === "cafe" ? "club" : theme;
    applyTheme(effective);
    document.documentElement.dataset.booth = booth ? "true" : "false";
  }, [theme, booth]);
}

export function useLargeTargetScale(): number {
  const settings = useTopic("settings");
  return settings.largeTargets ? largeTargetScale : 1;
}

export function useApplyStageTheme(theme: ThemeId): void {
  useEffect(() => {
    applyTheme(theme);
    document.documentElement.dataset.booth = "false";
  }, [theme]);
}
