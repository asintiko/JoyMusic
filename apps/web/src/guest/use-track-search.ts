"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createAbortableApi } from "./api";
import {
  createSearchController,
  type SearchController,
  type SearchState,
} from "./search-controller";

const idle: SearchState = { status: "idle", query: "", tracks: [] };

export function useTrackSearch(limit = 20) {
  const [state, setState] = useState<SearchState>(idle);
  const controller = useRef<SearchController | null>(null);

  useEffect(() => {
    const instance = createSearchController({
      run: async (query, signal) => {
        const result = await createAbortableApi(signal).call("catalogSearch", {
          query: { q: query, limit },
        });
        return result.tracks;
      },
      onChange: setState,
    });
    controller.current = instance;
    return () => {
      instance.destroy();
      controller.current = null;
    };
  }, [limit]);

  const search = useCallback((input: string) => controller.current?.search(input), []);
  const retry = useCallback(() => controller.current?.retry(), []);
  const reset = useCallback(() => controller.current?.cancel(), []);

  return useMemo(() => ({ state, search, retry, reset }), [state, search, retry, reset]);
}
