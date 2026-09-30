"use client";

import { useEffect, useSyncExternalStore } from "react";
import { sharedPreviewPlayer, type PreviewState } from "./preview-player";

const serverState: PreviewState = { trackId: null, status: "idle", progress: 0 };

export function usePreviewPlayer() {
  const player = typeof window === "undefined" ? null : sharedPreviewPlayer();
  const state = useSyncExternalStore(
    (listener) => (player ? player.subscribe(listener) : () => undefined),
    () => (player ? player.getState() : serverState),
    () => serverState,
  );
  useEffect(() => () => player?.stop(), [player]);
  return {
    state,
    toggle: player?.toggle ?? (() => undefined),
    stop: player?.stop ?? (() => undefined),
  };
}
