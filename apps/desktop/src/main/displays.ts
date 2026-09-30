import type { DisplayInfo } from "../common/bridge";

export interface DisplayLike {
  id: number;
  label: string;
  size: { width: number; height: number };
  scaleFactor: number;
}

export function describeDisplay(display: DisplayLike, primaryId: number): DisplayInfo {
  const name = display.label && display.label.length > 0 ? display.label : `Display ${display.id}`;
  return {
    id: display.id,
    label: name,
    width: Math.round(display.size.width * display.scaleFactor),
    height: Math.round(display.size.height * display.scaleFactor),
    primary: display.id === primaryId,
    scaleFactor: display.scaleFactor,
  };
}

export function chooseStageDisplay<D extends { id: number }>(
  displays: readonly D[],
  primaryId: number,
  requested: number | null,
): D | null {
  if (displays.length === 0) return null;
  const exact = requested === null ? undefined : displays.find((entry) => entry.id === requested);
  if (exact) return exact;
  return displays.find((entry) => entry.id !== primaryId) ?? displays[0] ?? null;
}
