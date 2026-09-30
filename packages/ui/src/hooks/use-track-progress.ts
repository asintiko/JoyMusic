import { useEffect, useState } from "react";
import { clamp } from "../lib/format";

export interface TrackProgressInput {
  startedAt: string | number | Date | null | undefined;
  durationSec: number | null | undefined;
  serverOffsetMs?: number;
  paused?: boolean;
  intervalMs?: number;
}

export interface TrackProgress {
  progress: number;
  elapsedSec: number;
  remainingSec: number | null;
}

function compute(input: TrackProgressInput, now: number): TrackProgress {
  if (input.startedAt === null || input.startedAt === undefined) {
    return { progress: 0, elapsedSec: 0, remainingSec: input.durationSec ?? null };
  }
  const started = new Date(input.startedAt).getTime();
  const elapsedSec = Math.max(0, (now + (input.serverOffsetMs ?? 0) - started) / 1000);
  const duration = input.durationSec ?? null;
  if (!duration || duration <= 0) return { progress: 0, elapsedSec, remainingSec: null };
  const bounded = Math.min(elapsedSec, duration);
  return {
    progress: clamp(bounded / duration, 0, 1),
    elapsedSec: bounded,
    remainingSec: Math.max(0, duration - bounded),
  };
}

export function useTrackProgress(input: TrackProgressInput): TrackProgress {
  const { startedAt, durationSec, serverOffsetMs, paused, intervalMs = 500 } = input;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (paused) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(timer);
  }, [paused, intervalMs, startedAt]);

  return compute({ startedAt, durationSec, serverOffsetMs }, now);
}

export { compute as computeTrackProgress };
