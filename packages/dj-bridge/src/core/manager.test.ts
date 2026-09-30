import { describe, expect, it } from "vitest";
import { nowPlayingSchema } from "@joymusic/shared";
import { createManualTime } from "../testing";
import { createAdapterManager } from "./manager";
import { toNowPlaying } from "./nowplaying";
import { selectOnAirDeck } from "./onair";
import { createSimulatorAdapter } from "./simulator";
import type {
  AdapterState,
  DeckState,
  NowPlayingAdapter,
  NowPlayingEvent,
  NowPlayingSink,
} from "./types";
import { createStatusHolder } from "./timers";

function scriptedAdapter(id: string, time: ReturnType<typeof createManualTime>) {
  const holder = createStatusHolder(time);
  let sink: NowPlayingSink | null = null;
  let stopped = 0;
  const adapter: NowPlayingAdapter = {
    id,
    label: id,
    source: "serato",
    async start(next) {
      sink = next;
      holder.bind(next);
      holder.set("active");
    },
    async stop() {
      stopped += 1;
      sink = null;
      holder.bind(null);
    },
    status: () => holder.get(),
  };
  return {
    adapter,
    get sink() {
      return sink;
    },
    get stopped() {
      return stopped;
    },
  };
}

const a = { title: "Song A", artist: "Artist" };
const b = { title: "Song B", artist: "Artist" };

describe("selectOnAirDeck", () => {
  const deck = (id: string, extra: Partial<DeckState> = {}): DeckState => ({
    deck: id,
    track: { title: `T${id}`, artist: "X" },
    ...extra,
  });

  it("returns null with no loaded decks", () => {
    expect(selectOnAirDeck([{ deck: "1", track: null }])).toBeNull();
  });

  it("prefers the on-air deck", () => {
    const picked = selectOnAirDeck([
      deck("1", { onAir: false, playing: true, loadedAt: 5 }),
      deck("2", { onAir: true, playing: true, loadedAt: 1 }),
    ]);
    expect(picked?.deck).toBe("2");
  });

  it("returns null when every deck is explicitly off air", () => {
    expect(selectOnAirDeck([deck("1", { onAir: false }), deck("2", { onAir: false })])).toBeNull();
  });

  it("picks the most recently started of two on-air decks during a transition", () => {
    const picked = selectOnAirDeck([
      deck("1", { onAir: true, playing: true, loadedAt: 10 }),
      deck("2", { onAir: true, playing: true, loadedAt: 20 }),
    ]);
    expect(picked?.deck).toBe("2");
  });

  it("falls back to playing then most recently loaded without on-air info", () => {
    expect(
      selectOnAirDeck([
        deck("1", { playing: false, loadedAt: 99 }),
        deck("2", { playing: true, loadedAt: 1 }),
      ])?.deck,
    ).toBe("2");
    expect(selectOnAirDeck([deck("1", { loadedAt: 1 }), deck("2", { loadedAt: 2 })])?.deck).toBe(
      "2",
    );
  });

  it("ignores decks that are off air when others have unknown state", () => {
    expect(
      selectOnAirDeck([deck("1", { onAir: false, loadedAt: 9 }), deck("2", { loadedAt: 1 })])?.deck,
    ).toBe("2");
  });
});

describe("AdapterManager", () => {
  it("debounces and emits the track after it stays stable", async () => {
    const time = createManualTime();
    const manager = createAdapterManager({ clock: time, timers: time, debounceMs: 1000 });
    const script = scriptedAdapter("serato", time);
    manager.register(script.adapter);
    const events: NowPlayingEvent[] = [];
    manager.on("nowPlaying", (event) => events.push(event));
    await manager.enable("serato");
    script.sink?.track(a);
    time.advance(999);
    expect(events).toHaveLength(0);
    time.advance(1);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ reason: "changed", adapterId: "serato", source: "serato" });
    expect(events[0]?.track?.title).toBe("Song A");
  });

  it("swallows flapping A to B to A inside the debounce window", async () => {
    const time = createManualTime();
    const manager = createAdapterManager({ clock: time, timers: time, debounceMs: 1000 });
    const script = scriptedAdapter("serato", time);
    manager.register(script.adapter);
    const events: NowPlayingEvent[] = [];
    manager.on("nowPlaying", (event) => events.push(event));
    await manager.enable("serato");
    script.sink?.track(a);
    time.advance(1000);
    script.sink?.track(b);
    time.advance(400);
    script.sink?.track(a);
    time.advance(5000);
    expect(events.map((event) => event.track?.title)).toEqual(["Song A"]);
  });

  it("dedupes identical tracks that differ only in case and spacing", async () => {
    const time = createManualTime();
    const manager = createAdapterManager({ clock: time, timers: time, debounceMs: 0 });
    const script = scriptedAdapter("serato", time);
    manager.register(script.adapter);
    const events: NowPlayingEvent[] = [];
    manager.on("nowPlaying", (event) => events.push(event));
    await manager.enable("serato");
    script.sink?.track(a);
    script.sink?.track({ title: "  song   a ", artist: "ARTIST" });
    expect(events).toHaveLength(1);
  });

  it("emits a metadata update when bpm arrives late", async () => {
    const time = createManualTime();
    const manager = createAdapterManager({ clock: time, timers: time, debounceMs: 0 });
    const script = scriptedAdapter("serato", time);
    manager.register(script.adapter);
    const events: NowPlayingEvent[] = [];
    manager.on("nowPlaying", (event) => events.push(event));
    await manager.enable("serato");
    script.sink?.track(a);
    script.sink?.track({ ...a, bpm: 120 });
    expect(events.map((event) => event.reason)).toEqual(["changed", "metadata"]);
    expect(manager.current()?.track?.bpm).toBe(120);
  });

  it("uses on-air deck logic and switches on crossfade", async () => {
    const time = createManualTime();
    const manager = createAdapterManager({ clock: time, timers: time, debounceMs: 0 });
    const script = scriptedAdapter("prolink", time);
    manager.register(script.adapter);
    const titles: (string | undefined)[] = [];
    manager.on("nowPlaying", (event) => titles.push(event.track?.title));
    await manager.enable("prolink");
    script.sink?.deck({ deck: "1", track: a, onAir: true, playing: true });
    script.sink?.deck({ deck: "2", track: b, onAir: false, playing: true });
    script.sink?.deck({ deck: "1", track: a, onAir: false, playing: true });
    script.sink?.deck({ deck: "2", track: b, onAir: true, playing: true });
    expect(titles).toEqual(["Song A", "Song B"]);
  });

  it("clears after the clear delay when the deck empties", async () => {
    const time = createManualTime();
    const manager = createAdapterManager({
      clock: time,
      timers: time,
      debounceMs: 0,
      clearAfterMs: 3000,
    });
    const script = scriptedAdapter("prolink", time);
    manager.register(script.adapter);
    const events: NowPlayingEvent[] = [];
    manager.on("nowPlaying", (event) => events.push(event));
    await manager.enable("prolink");
    script.sink?.deck({ deck: "1", track: a, onAir: true });
    script.sink?.removeDeck("1");
    time.advance(2999);
    expect(events).toHaveLength(1);
    time.advance(1);
    expect(events.at(-1)).toMatchObject({ reason: "cleared", track: null });
  });

  it("lets the most recently changed adapter win and falls back when it disables", async () => {
    const time = createManualTime();
    const manager = createAdapterManager({ clock: time, timers: time, debounceMs: 0 });
    const one = scriptedAdapter("one", time);
    const two = scriptedAdapter("two", time);
    manager.register(one.adapter);
    manager.register(two.adapter);
    await manager.enable("one");
    await manager.enable("two");
    one.sink?.track(a);
    time.advance(10);
    two.sink?.track(b);
    expect(manager.current()?.track?.title).toBe("Song B");
    await manager.disable("two");
    expect(manager.current()?.track?.title).toBe("Song A");
    expect(two.stopped).toBe(1);
  });

  it("ignores sink calls after disable and reports status events", async () => {
    const time = createManualTime();
    const manager = createAdapterManager({ clock: time, timers: time, debounceMs: 0 });
    const script = scriptedAdapter("one", time);
    manager.register(script.adapter);
    const states: AdapterState[] = [];
    manager.on("status", (event) => states.push(event.status.state));
    await manager.enable("one");
    const stale = script.sink as NowPlayingSink;
    await manager.disable("one");
    stale.track(a);
    expect(manager.current()).toBeNull();
    expect(states).toEqual(["starting", "active", "stopped"]);
  });

  it("marks an adapter as error when start throws", async () => {
    const time = createManualTime();
    const errors: unknown[] = [];
    const manager = createAdapterManager({
      clock: time,
      timers: time,
      onError: (_id, error) => errors.push(error),
    });
    const broken: NowPlayingAdapter = {
      id: "broken",
      label: "Broken",
      source: "manual",
      async start() {
        throw new Error("boom");
      },
      async stop() {},
      status: () => ({ state: "error", detail: "boom", since: 0 }),
    };
    manager.register(broken);
    await manager.enable("broken");
    expect(manager.list()[0]?.status).toMatchObject({ state: "error", detail: "boom" });
    expect(errors).toHaveLength(1);
  });
});

describe("SimulatorAdapter", () => {
  it("plays the scripted tracks through the manager", async () => {
    const time = createManualTime();
    const manager = createAdapterManager({ clock: time, timers: time, debounceMs: 0 });
    const simulator = createSimulatorAdapter({
      clock: time,
      timers: time,
      steps: [
        { track: a, holdMs: 1000 },
        { track: b, holdMs: 1000 },
      ],
    });
    manager.register(simulator);
    const titles: (string | undefined)[] = [];
    manager.on("nowPlaying", (event) => titles.push(event.track?.title));
    await manager.enable("simulator");
    time.advance(1000);
    time.advance(1000);
    expect(titles).toEqual(["Song A", "Song B", "Song A"]);
    await manager.disable("simulator");
    expect(time.pending()).toBe(0);
  });
});

describe("toNowPlaying", () => {
  it("produces a value accepted by the shared schema", () => {
    const value = toNowPlaying(
      {
        title: "T",
        artist: "A",
        bpm: 300,
        key: "8A",
        durationSec: 200.4,
        startedAt: 1_700_000_000_000,
      },
      "serato",
      0,
    );
    expect(nowPlayingSchema.safeParse(value).success).toBe(true);
    expect(value.bpm).toBe(150);
    expect(value.durationSec).toBe(200);
  });

  it("drops unusable bpm", () => {
    expect(toNowPlaying({ title: "T", artist: "", bpm: 0 }, "manual", 0).bpm).toBeNull();
  });
});
