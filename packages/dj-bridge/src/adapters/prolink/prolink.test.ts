import { describe, expect, it } from "vitest";
import { createManualTime, createRecordingSink } from "../../testing";
import { createProlinkAdapter } from "./adapter";
import type { ProlinkModuleLike, ProlinkNetworkLike } from "./adapter";
import { mapProlinkDeck, prolinkPlayState } from "./mapper";
import type { ProlinkStatusLike } from "./mapper";

const status = (extra: Partial<ProlinkStatusLike> = {}): ProlinkStatusLike => ({
  deviceId: 2,
  trackId: 44,
  trackDeviceId: 2,
  trackSlot: 3,
  trackType: 1,
  playState: prolinkPlayState.playing,
  isOnAir: true,
  trackBPM: 128,
  ...extra,
});

const metadata = {
  title: "Sevaman",
  duration: 214,
  tempo: 96,
  artist: { name: "Shahzoda" },
  album: { name: "Album" },
  key: { name: "8A" },
};

describe("mapProlinkDeck", () => {
  it("maps onAir, bpm, key, album and duration", () => {
    const deck = mapProlinkDeck(status(), metadata);
    expect(deck).toMatchObject({ deck: "2", onAir: true, playing: true });
    expect(deck.track).toEqual({
      title: "Sevaman",
      artist: "Shahzoda",
      album: "Album",
      bpm: 128,
      key: "8A",
      deck: "2",
      durationSec: 214,
    });
  });

  it("falls back to metadata tempo and handles missing relations", () => {
    const deck = mapProlinkDeck(status({ trackBPM: null }), { title: "X", tempo: 100 });
    expect(deck.track).toMatchObject({ title: "X", artist: "", bpm: 100 });
  });

  it("produces an empty deck without metadata or when nothing is loaded", () => {
    expect(mapProlinkDeck(status(), null).track).toBeNull();
    expect(
      mapProlinkDeck(status({ trackId: 0, playState: prolinkPlayState.empty }), metadata).track,
    ).toBeNull();
  });

  it("marks paused and cued decks as not playing", () => {
    expect(mapProlinkDeck(status({ playState: prolinkPlayState.paused }), metadata).playing).toBe(
      false,
    );
    expect(mapProlinkDeck(status({ playState: prolinkPlayState.cued }), metadata).playing).toBe(
      false,
    );
  });
});

function fakeNetwork() {
  const listeners = new Set<(status: ProlinkStatusLike) => void>();
  const lookups: number[] = [];
  let disconnected = 0;
  let connected = 0;
  const network: ProlinkNetworkLike = {
    async autoconfigFromPeers() {},
    connect() {
      connected += 1;
    },
    async disconnect() {
      disconnected += 1;
    },
    statusEmitter: {
      on: (_event, listener) => listeners.add(listener),
      off: (_event, listener) => listeners.delete(listener),
    },
    db: {
      async getMetadata(options) {
        lookups.push(options.trackId);
        return { ...metadata, title: `Track ${options.trackId}` };
      },
    },
  };
  const module: ProlinkModuleLike = { bringOnline: async () => network };
  return {
    module,
    emit: (value: ProlinkStatusLike) => listeners.forEach((listener) => listener(value)),
    lookups,
    get disconnected() {
      return disconnected;
    },
    get connected() {
      return connected;
    },
    listenerCount: () => listeners.size,
  };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("createProlinkAdapter", () => {
  it("reports unavailable when the package cannot be imported", async () => {
    const adapter = createProlinkAdapter({
      loader: async () => {
        throw new Error("Cannot find package");
      },
    });
    await adapter.start(createRecordingSink());
    await flush();
    expect(adapter.status().state).toBe("unavailable");
  });

  it("looks up metadata once per loaded track and emits deck updates", async () => {
    const net = fakeNetwork();
    const adapter = createProlinkAdapter({
      loader: async () => net.module,
      clock: createManualTime(),
    });
    const sink = createRecordingSink();
    await adapter.start(sink);
    await flush();
    expect(adapter.status().state).toBe("active");
    expect(net.connected).toBe(1);

    net.emit(status());
    await flush();
    net.emit(status({ isOnAir: false }));
    net.emit(status({ trackId: 45 }));
    await flush();
    expect(net.lookups).toEqual([44, 45]);
    expect(sink.decks.get("2")?.track?.title).toBe("Track 45");

    net.emit(status({ trackId: 0, playState: prolinkPlayState.empty }));
    expect(sink.decks.has("2")).toBe(false);

    await adapter.stop();
    expect(net.disconnected).toBe(1);
    expect(net.listenerCount()).toBe(0);
    expect(adapter.status().state).toBe("stopped");
  });

  it("ignores a late metadata answer for a track that was replaced", async () => {
    const net = fakeNetwork();
    let release: (() => void) | null = null;
    const original = net.module;
    const slow: ProlinkModuleLike = {
      bringOnline: async () => {
        const network = await original.bringOnline();
        const db = network.db;
        if (db) {
          const getMetadata = db.getMetadata.bind(db);
          db.getMetadata = async (options) => {
            if (options.trackId === 1) await new Promise<void>((resolve) => (release = resolve));
            return getMetadata(options);
          };
        }
        return network;
      },
    };
    const adapter = createProlinkAdapter({ loader: async () => slow });
    const sink = createRecordingSink();
    await adapter.start(sink);
    await flush();
    net.emit(status({ trackId: 1 }));
    net.emit(status({ trackId: 2 }));
    await flush();
    (release as (() => void) | null)?.();
    await flush();
    expect(sink.decks.get("2")?.track?.title).toBe("Track 2");
  });
});
