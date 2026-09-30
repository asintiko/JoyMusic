import { createStatusHolder, systemClock } from "../../core/timers";
import type { Clock, DetectedTrack, NowPlayingAdapter, NowPlayingSink } from "../../core/types";
import { describeError, dynamicModuleLoader, withTimeout } from "../module-loader";
import type { ModuleLoader } from "../module-loader";
import { mapProlinkDeck, prolinkDeckEmpty, prolinkTrackKey } from "./mapper";
import type { ProlinkStatusLike, ProlinkTrackLike } from "./mapper";

export interface ProlinkNetworkLike {
  autoconfigFromPeers(): Promise<void>;
  connect(): void;
  disconnect(): Promise<unknown>;
  statusEmitter: {
    on(event: "status", listener: (status: ProlinkStatusLike) => void): unknown;
    off(event: "status", listener: (status: ProlinkStatusLike) => void): unknown;
  } | null;
  db: {
    getMetadata(options: {
      deviceId: number;
      trackSlot: number;
      trackType: number;
      trackId: number;
    }): Promise<ProlinkTrackLike | null>;
  } | null;
}

export interface ProlinkModuleLike {
  bringOnline(): Promise<ProlinkNetworkLike>;
}

export interface ProlinkAdapterOptions {
  loader?: ModuleLoader;
  metadataTimeoutMs?: number;
  clock?: Clock;
}

interface DeckCache {
  key: string;
  track: DetectedTrack | null;
}

export const prolinkModuleName = "prolink-connect";

export function createProlinkAdapter(options: ProlinkAdapterOptions = {}): NowPlayingAdapter {
  const clock = options.clock ?? systemClock;
  const loader = options.loader ?? dynamicModuleLoader;
  const metadataTimeoutMs = options.metadataTimeoutMs ?? 4000;
  const holder = createStatusHolder(clock);
  let generation = 0;
  let network: ProlinkNetworkLike | null = null;
  let listener: ((status: ProlinkStatusLike) => void) | null = null;

  const attach = (net: ProlinkNetworkLike, sink: NowPlayingSink, token: number) => {
    const emitter = net.statusEmitter;
    if (emitter === null) throw new Error("Pro DJ Link status emitter is not available");
    const cache = new Map<number, DeckCache>();
    const onStatus = (status: ProlinkStatusLike) => {
      if (token !== generation) return;
      const deckId = status.deviceId;
      if (prolinkDeckEmpty(status)) {
        if (cache.delete(deckId)) sink.removeDeck(String(deckId));
        return;
      }
      const key = prolinkTrackKey(status);
      const cached = cache.get(deckId);
      if (cached && cached.key === key) {
        const state = mapProlinkDeck(status, null);
        state.track = cached.track;
        sink.deck(state);
        return;
      }
      cache.set(deckId, { key, track: null });
      sink.deck(mapProlinkDeck(status, null));
      const db = net.db;
      if (db === null) return;
      withTimeout(
        db.getMetadata({
          deviceId: status.trackDeviceId,
          trackSlot: status.trackSlot,
          trackType: status.trackType,
          trackId: status.trackId,
        }),
        metadataTimeoutMs,
      ).then(
        (metadata) => {
          if (token !== generation) return;
          const current = cache.get(deckId);
          if (!current || current.key !== key) return;
          const state = mapProlinkDeck(status, metadata);
          current.track = state.track;
          sink.deck(state);
        },
        (error: unknown) => {
          if (token !== generation) return;
          holder.set("active", `Metadata lookup failed: ${describeError(error)}`);
        },
      );
    };
    listener = onStatus;
    emitter.on("status", onStatus);
  };

  const connect = async (sink: NowPlayingSink, token: number) => {
    let module: ProlinkModuleLike;
    try {
      module = (await loader(prolinkModuleName)) as ProlinkModuleLike;
    } catch {
      holder.set("unavailable", "The prolink-connect package is not installed");
      return;
    }
    try {
      const net = await module.bringOnline();
      if (token !== generation) {
        await net.disconnect();
        return;
      }
      network = net;
      holder.set("waiting", "Waiting for Pioneer players on the network");
      await net.autoconfigFromPeers();
      if (token !== generation) return;
      net.connect();
      attach(net, sink, token);
      holder.set("active", "Connected to Pro DJ Link");
    } catch (error) {
      if (token === generation) holder.set("error", describeError(error));
    }
  };

  return {
    id: "prolink",
    label: "Pioneer Pro DJ Link",
    source: "prolink",
    async start(sink) {
      generation += 1;
      holder.bind(sink);
      holder.set("starting");
      void connect(sink, generation);
    },
    async stop() {
      generation += 1;
      const net = network;
      const attached = listener;
      network = null;
      listener = null;
      if (net !== null) {
        try {
          if (attached) net.statusEmitter?.off("status", attached);
          await net.disconnect();
        } catch {
          holder.set("stopped");
        }
      }
      holder.bind(null);
      holder.set("stopped");
    },
    status: () => holder.get(),
  };
}
