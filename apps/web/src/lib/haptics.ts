export type HapticPattern = "tap" | "success" | "warning";

const patterns: Record<HapticPattern, number | number[]> = {
  tap: 8,
  success: [12, 40, 18],
  warning: [30, 60, 30],
};

export function haptic(pattern: HapticPattern): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(patterns[pattern]);
  } catch {
    return;
  }
}
