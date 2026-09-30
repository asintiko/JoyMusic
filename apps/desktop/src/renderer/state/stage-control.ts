import { useCallback, useEffect, useMemo } from "react";
import type { PublicVenue } from "@joymusic/shared";
import type { StageConfig } from "../../common/bridge";
import { getBridge } from "../bridge/access";
import { useTopic } from "../lib/topics";

export function displayUrlOf(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`.replace(/\/+$/u, "");
  } catch {
    return url;
  }
}

export function buildStageConfig(
  venue: PublicVenue,
  webUrl: string,
  locale: StageConfig["locale"],
  themeOverride: StageConfig["themeOverride"],
): StageConfig {
  const qrUrl = `${webUrl.replace(/\/+$/u, "")}/v/${venue.slug}`;
  return {
    venueSlug: venue.slug,
    venueName: venue.name,
    venueCity: venue.city,
    venueTheme: venue.theme,
    logoUrl: venue.logoUrl,
    coverUrl: venue.coverUrl,
    qrUrl,
    displayUrl: displayUrlOf(qrUrl),
    locale,
    themeOverride,
  };
}

export function useStageControl() {
  const stage = useTopic("stage");
  const settings = useTopic("settings");
  const open = useCallback(async () => {
    await getBridge().stage.open(settings.stage.displayId);
  }, [settings.stage.displayId]);
  const close = useCallback(async () => {
    await getBridge().stage.close();
  }, []);
  const toggle = useCallback(async () => {
    if (stage.open) await close();
    else await open();
  }, [stage.open, open, close]);
  return useMemo(() => ({ stage, open, close, toggle }), [stage, open, close, toggle]);
}

export function useStageConfigSync(config: StageConfig | null): void {
  const serialized = config ? JSON.stringify(config) : null;
  useEffect(() => {
    void getBridge().stage.setConfig(serialized ? (JSON.parse(serialized) as StageConfig) : null);
  }, [serialized]);
}
