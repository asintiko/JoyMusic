import { describe, expect, it, vi } from "vitest";
import { clearRecent, loadRecent, pushRecent } from "@/guest/recent-searches";
import { createPreviewPlayer, type AudioLike } from "@/guest/preview-player";
import { createMemoryStore } from "@/lib/storage";
import { stageScale, tvDedications, tvMode, tvTicker } from "@/tv/tv-model";
import { makeRequest, makeVenueState } from "./helpers";

describe("recent searches", () => {
  it("keeps the newest first without duplicates", () => {
    const store = createMemoryStore();
    pushRecent(store, "Shahzoda");
    pushRecent(store, "Ozoda");
    pushRecent(store, "shahzoda");
    expect(loadRecent(store)).toEqual(["shahzoda", "Ozoda"]);
  });

  it("ignores short queries and caps the list", () => {
    const store = createMemoryStore();
    pushRecent(store, "a");
    for (let index = 0; index < 12; index += 1) pushRecent(store, `query ${index}`);
    expect(loadRecent(store)).toHaveLength(8);
    expect(loadRecent(store)[0]).toBe("query 11");
    expect(clearRecent(store)).toEqual([]);
    expect(loadRecent(store)).toEqual([]);
  });

  it("survives corrupted storage", () => {
    const store = createMemoryStore();
    store.set("jm:recent-searches", "{oops");
    expect(loadRecent(store)).toEqual([]);
  });
});

function fakeAudio() {
  const listeners = new Map<string, Set<() => void>>();
  const audio = {
    src: "",
    currentTime: 0,
    duration: 30,
    paused: true,
    preload: "",
    play: vi.fn(() => Promise.resolve()),
    pause: vi.fn(),
    addEventListener(type: string, listener: () => void) {
      listeners.set(type, (listeners.get(type) ?? new Set()).add(listener));
    },
    removeEventListener(type: string, listener: () => void) {
      listeners.get(type)?.delete(listener);
    },
    emit(type: string) {
      for (const listener of listeners.get(type) ?? []) listener();
    },
  };
  return audio satisfies AudioLike & { emit: (type: string) => void };
}

describe("preview player", () => {
  it("plays one preview at a time", () => {
    const instances: ReturnType<typeof fakeAudio>[] = [];
    const player = createPreviewPlayer(() => {
      const audio = fakeAudio();
      instances.push(audio);
      return audio;
    });
    player.toggle("a", "https://cdn/a.mp3");
    expect(player.getState()).toMatchObject({ trackId: "a", status: "loading" });
    instances[0]?.emit("playing");
    expect(player.getState().status).toBe("playing");
    player.toggle("b", "https://cdn/b.mp3");
    expect(instances[0]?.pause).toHaveBeenCalled();
    expect(player.getState().trackId).toBe("b");
  });

  it("toggles off, reports progress and stops at the end", () => {
    const instances: ReturnType<typeof fakeAudio>[] = [];
    const player = createPreviewPlayer(() => {
      const audio = fakeAudio();
      instances.push(audio);
      return audio;
    });
    player.toggle("a", "https://cdn/a.mp3");
    const audio = instances[0];
    if (!audio) throw new Error("missing audio");
    audio.currentTime = 15;
    audio.emit("timeupdate");
    expect(player.getState().progress).toBeCloseTo(0.5, 5);
    audio.emit("ended");
    expect(player.getState()).toMatchObject({ trackId: null, status: "idle" });
    player.toggle("a", "https://cdn/a.mp3");
    player.toggle("a", "https://cdn/a.mp3");
    expect(player.getState().status).toBe("idle");
  });

  it("resets when playback fails", async () => {
    const audio = fakeAudio();
    audio.play.mockRejectedValueOnce(new Error("blocked"));
    const player = createPreviewPlayer(() => audio);
    player.toggle("a", "https://cdn/a.mp3");
    await Promise.resolve();
    await Promise.resolve();
    expect(player.getState().status).toBe("idle");
  });
});

describe("tv model", () => {
  it("derives the screen mode", () => {
    expect(tvMode(null)).toBe("waiting");
    expect(tvMode(makeVenueState({ session: null }))).toBe("waiting");
    expect(tvMode(makeVenueState())).toBe("idle");
    expect(
      tvMode(
        makeVenueState({
          nowPlaying: {
            title: "x",
            artist: "y",
            artworkUrl: null,
            track: null,
            startedAt: "2026-09-30T20:00:00.000Z",
            durationSec: 100,
            bpm: null,
            key: null,
            source: "manual",
            requestId: null,
            dedicatedTo: null,
          },
        }),
      ),
    ).toBe("playing");
  });

  it("lists dedications only from queued requests", () => {
    const state = makeVenueState({
      queue: [
        makeRequest({ id: "a", status: "accepted", dedicatedTo: "Aziz", title: "One" }),
        makeRequest({ id: "b", status: "accepted", dedicatedTo: null }),
      ],
      pending: [makeRequest({ id: "c", dedicatedTo: "Secret" })],
    });
    expect(tvDedications(state)).toEqual([{ id: "a", name: "Aziz", title: "One" }]);
  });

  it("builds the ticker after the featured items", () => {
    const state = makeVenueState({
      queue: [1, 2, 3, 4].map((n) => makeRequest({ id: `q${n}`, status: "accepted" })),
      pending: [makeRequest({ id: "p1", votes: 4 })],
    });
    expect(tvTicker(state, 2).map((entry) => entry.id)).toEqual(["q3", "q4", "p1"]);
    expect(tvTicker(state, 2)[2]?.pending).toBe(true);
  });

  it("fits the 1920x1080 stage into any viewport", () => {
    expect(stageScale(1920, 1080)).toBe(1);
    expect(stageScale(1280, 720)).toBeCloseTo(2 / 3, 5);
    expect(stageScale(1000, 1000)).toBeCloseTo(1000 / 1920, 5);
    expect(stageScale(0, 0)).toBe(1);
  });
});
