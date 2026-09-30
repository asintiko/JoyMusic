import { useEffect, useState } from "react";
import { paletteFromImage } from "../lib/palette";

export type ArtworkPaletteStatus = "idle" | "loading" | "ready" | "fallback";

export interface ArtworkPalette {
  colors: string[] | null;
  status: ArtworkPaletteStatus;
}

const cache = new Map<string, string[] | null>();
const inflight = new Map<string, Promise<string[] | null>>();

function loadPalette(url: string): Promise<string[] | null> {
  const existing = inflight.get(url);
  if (existing) return existing;
  const promise = new Promise<string[] | null>((resolve) => {
    if (typeof Image === "undefined") {
      resolve(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(paletteFromImage(image));
    image.onerror = () => resolve(null);
    image.src = url;
  }).then((colors) => {
    cache.set(url, colors);
    inflight.delete(url);
    return colors;
  });
  inflight.set(url, promise);
  return promise;
}

export function clearArtworkPaletteCache(): void {
  cache.clear();
  inflight.clear();
}

export function useArtworkPalette(url: string | null | undefined): ArtworkPalette {
  const [state, setState] = useState<ArtworkPalette>(() => {
    if (!url) return { colors: null, status: "idle" };
    if (cache.has(url)) {
      const colors = cache.get(url) ?? null;
      return { colors, status: colors ? "ready" : "fallback" };
    }
    return { colors: null, status: "loading" };
  });

  useEffect(() => {
    if (!url) {
      setState({ colors: null, status: "idle" });
      return undefined;
    }
    if (cache.has(url)) {
      const colors = cache.get(url) ?? null;
      setState({ colors, status: colors ? "ready" : "fallback" });
      return undefined;
    }
    let cancelled = false;
    setState((previous) => ({ colors: previous.colors, status: "loading" }));
    void loadPalette(url).then((colors) => {
      if (cancelled) return;
      setState({ colors, status: colors ? "ready" : "fallback" });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return state;
}
