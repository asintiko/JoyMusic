import { serverOffset } from "@joymusic/shared";

export interface OffsetEstimator {
  sample(serverTime: string, receivedAt: number): number;
  value(): number;
  reset(): void;
}

export function createOffsetEstimator(windowSize = 6): OffsetEstimator {
  let samples: number[] = [];
  return {
    sample(serverTime, receivedAt) {
      const offset = serverOffset(serverTime, receivedAt);
      if (Number.isFinite(offset)) samples = [...samples, offset].slice(-windowSize);
      return samples.length > 0 ? Math.max(...samples) : 0;
    },
    value: () => (samples.length > 0 ? Math.max(...samples) : 0),
    reset() {
      samples = [];
    },
  };
}
