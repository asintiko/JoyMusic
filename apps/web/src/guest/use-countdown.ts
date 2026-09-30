"use client";

import { useEffect, useState } from "react";

export function useCountdown(totalSeconds: number | null, restartKey: unknown = null): number {
  const [state, setState] = useState({
    total: totalSeconds,
    key: restartKey,
    remaining: totalSeconds ?? 0,
  });

  if (state.total !== totalSeconds || state.key !== restartKey) {
    setState({ total: totalSeconds, key: restartKey, remaining: totalSeconds ?? 0 });
  }

  useEffect(() => {
    if (totalSeconds === null) return undefined;
    const target = Date.now() + totalSeconds * 1000;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setState((previous) =>
        previous.remaining === remaining ? previous : { ...previous, remaining },
      );
    };
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [totalSeconds, restartKey]);

  return state.remaining;
}
