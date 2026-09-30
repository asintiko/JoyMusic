"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type {
  ApiClient,
  RealtimeClient,
  RealtimeRole,
  RealtimeStatus,
  RequestItem,
  VenueState,
} from "@joymusic/shared";
import { createOffsetEstimator } from "@/lib/clock";
import { publicApiUrl } from "@/lib/env";
import { createExternalValue, useExternalValue, type ExternalValue } from "@/lib/external-value";
import { loadShared } from "@/lib/shared-runtime";
import { createLazyApi } from "./api";
import { initialLiveState, liveReducer, overlayMine } from "./live-state";
import type { GuestSessionStore } from "./session-store";

export interface VenueFeedOptions {
  slug: string;
  role: RealtimeRole;
  initial: VenueState | null;
  api?: ApiClient;
  store?: GuestSessionStore;
  startDelayMs?: number;
}

export interface VenueFeed {
  venue: VenueState | null;
  mine: Record<string, RequestItem>;
  offset: ExternalValue<number>;
  status: ExternalValue<RealtimeStatus>;
  failed: boolean;
  refresh: () => Promise<void>;
  refreshMine: () => Promise<void>;
  trackMine: (request: RequestItem) => void;
}

export function useVenueFeed({
  slug,
  role,
  initial,
  api,
  store,
  startDelayMs = 0,
}: VenueFeedOptions): VenueFeed {
  const [live, dispatch] = useReducer(liveReducer, initial, initialLiveState);
  const [failed, setFailed] = useState(false);
  const estimator = useRef(createOffsetEstimator());
  const offset = useMemo(
    () => createExternalValue(initial ? Date.parse(initial.serverTime) - Date.now() : 0),
    [initial],
  );
  const status = useMemo(() => createExternalValue<RealtimeStatus>("connecting"), []);

  const publicApi = useMemo(() => api ?? createLazyApi(), [api]);

  const sample = useCallback(
    (serverTime: string) => {
      offset.set(estimator.current.sample(serverTime, Date.now()));
    },
    [offset],
  );

  const refresh = useCallback(async () => {
    try {
      const state = await publicApi.call("venueState", { params: { slug } });
      sample(state.serverTime);
      dispatch({ type: "venue", state });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [publicApi, slug, sample]);

  const refreshMine = useCallback(async () => {
    if (!api || !store) return;
    try {
      const result = await api.call("requestsMine", { params: { slug } });
      dispatch({ type: "mine.replace", requests: result.requests });
    } catch {
      return;
    }
  }, [api, store, slug]);

  const trackMine = useCallback((request: RequestItem) => {
    dispatch({ type: "mine.upsert", request });
  }, []);

  const refreshMineRef = useRef(refreshMine);
  useEffect(() => {
    refreshMineRef.current = refreshMine;
  }, [refreshMine]);

  const hasInitial = initial !== null;
  useEffect(() => {
    if (hasInitial) return undefined;
    void refresh();
    return undefined;
  }, [hasInitial, refresh]);

  useEffect(() => {
    let client: RealtimeClient | null = null;
    let disposed = false;
    let timer: number | undefined;

    const start = async () => {
      const { createRealtimeClient } = await loadShared();
      if (disposed) return;
      client = createRealtimeClient({
        baseUrl: publicApiUrl,
        venue: slug,
        role,
        getToken: async () => {
          if (!store) return null;
          try {
            return (await store.ensure()).token;
          } catch {
            return null;
          }
        },
        onStatus: (next) => status.set(next),
        onEvent: (event) => {
          if (event.type === "state.snapshot") {
            sample(event.data.serverTime);
            void refreshMineRef.current();
          }
          dispatch({ type: "event", event });
        },
      });
      client.start();
    };

    timer = window.setTimeout(() => void start(), startDelayMs);

    const reconnect = () => {
      client?.stop();
      client = null;
      void start();
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refresh();
      client?.resync();
    };
    window.addEventListener("online", reconnect);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
      timer = undefined;
      window.removeEventListener("online", reconnect);
      document.removeEventListener("visibilitychange", onVisible);
      client?.stop();
    };
  }, [slug, role, store, sample, refresh, status, startDelayMs]);

  const venue = useMemo(
    () => (live.venue ? overlayMine(live.venue, live.mine) : null),
    [live.venue, live.mine],
  );

  return useMemo(
    () => ({ venue, mine: live.mine, offset, status, failed, refresh, refreshMine, trackMine }),
    [venue, live.mine, offset, status, failed, refresh, refreshMine, trackMine],
  );
}

export function useConnectivity(status: ExternalValue<RealtimeStatus>, graceMs = 2500): boolean {
  const socket = useExternalValue(status);
  const [online, setOnline] = useState(true);
  const [socketDown, setSocketDown] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (socket === "open") {
      setSocketDown(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setSocketDown(true), graceMs);
    return () => window.clearTimeout(timer);
  }, [socket, graceMs]);

  return online && !socketDown;
}
