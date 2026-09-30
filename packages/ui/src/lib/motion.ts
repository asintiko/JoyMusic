export const motionDurations = {
  instant: 0.08,
  fast: 0.14,
  base: 0.22,
  slow: 0.36,
  slower: 0.56,
  ambient: 1.4,
} as const;

export const motionEasings = {
  standard: [0.2, 0, 0, 1],
  out: [0.16, 1, 0.3, 1],
  in: [0.55, 0, 0.9, 0.4],
  inOut: [0.65, 0, 0.35, 1],
} as const;

export const motionSprings = {
  soft: { type: "spring", stiffness: 240, damping: 26, mass: 0.9 },
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 0.8 },
  bouncy: { type: "spring", stiffness: 340, damping: 20, mass: 0.9 },
  sheet: { type: "spring", stiffness: 380, damping: 38, mass: 1 },
} as const;

export const instantTransition = { duration: 0 } as const;
