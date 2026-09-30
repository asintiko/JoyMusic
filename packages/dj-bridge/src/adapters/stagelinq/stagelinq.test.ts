import { describe, expect, it } from "vitest";
import { createRecordingSink } from "../../testing";
import { createStageLinqAdapter } from "./adapter";
import type { StageLinqModuleLike } from "./adapter";
import { mapStageLinqDeck } from "./mapper";
import type { StageLinqPlayerStatusLike } from "./mapper";

const base: StageLinqPlayerStatusLike = {
  deck: "1A",
  title: "Blinding Lights",
  artist: "The Weeknd",
  key: "Am",
  currentBpm: 171.02,
  trackLength: 200,
  songLoaded: true,
  play: true,
  externalMixerVolume: 0.9,
};

describe("mapStageLinqDeck", () => {
  it("maps track fields", () => {
    expect(mapStageLinqDeck(base)?.track).toEqual({
      title: "Blinding Lights",
      artist: "The Weeknd",
      key: "Am",
      bpm: 171.02,
      deck: "1A",
      durationSec: 200,
    });
  });

  it("does not derive on-air from mixer volume unless enabled", () => {
    expect(mapStageLinqDeck({ ...base, externalMixerVolume: 0 })?.onAir).toBeUndefined();
    expect(
      mapStageLinqDeck({ ...base, externalMixerVolume: 0 }, { useMixerVolume: true })?.onAir,
    ).toBe(false);
    expect(mapStageLinqDeck(base, { useMixerVolume: true })?.onAir).toBe(true);
  });

  it("clears the deck when nothing is loaded and rejects unidentifiable decks", () => {
    expect(mapStageLinqDeck({ ...base, songLoaded: false })?.track).toBeNull();
    expect(mapStageLinqDeck({ ...base, title: "" })?.track).toBeNull();
    expect(mapStageLinqDeck({ title: "X" })).toBeNull();
  });
});

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("createStageLinqAdapter", () => {
  it("is unavailable when the package is missing", async () => {
    const adapter = createStageLinqAdapter({
      loader: async () => {
        throw new Error("missing");
      },
    });
    await adapter.start(createRecordingSink());
    await flush();
    expect(adapter.status()).toMatchObject({
      state: "unavailable",
      detail: "The stagelinq package is not installed",
    });
  });

  it("forwards player events and disconnects on stop", async () => {
    const handlers = new Map<string, (status: StageLinqPlayerStatusLike) => void>();
    let connects = 0;
    let disconnects = 0;
    const module: StageLinqModuleLike = {
      StageLinq: class {
        devices = {
          on: (event: string, listener: (status: StageLinqPlayerStatusLike) => void) => {
            handlers.set(event, listener);
          },
          off: (event: string) => {
            handlers.delete(event);
          },
        };
        async connect() {
          connects += 1;
        }
        async disconnect() {
          disconnects += 1;
        }
      },
    };
    const adapter = createStageLinqAdapter({ loader: async () => module });
    const sink = createRecordingSink();
    await adapter.start(sink);
    await flush();
    expect(connects).toBe(1);
    expect(adapter.status().state).toBe("active");
    handlers.get("nowPlaying")?.(base);
    expect(sink.decks.get("1A")?.track?.title).toBe("Blinding Lights");
    await adapter.stop();
    expect(disconnects).toBe(1);
    expect(handlers.size).toBe(0);
  });
});
