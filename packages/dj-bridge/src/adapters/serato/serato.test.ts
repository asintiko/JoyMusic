import { describe, expect, it } from "vitest";
import {
  settle,
  createManualTime,
  createMemoryFileSystem,
  createRecordingSink,
} from "../../testing";
import { createSeratoAdapter } from "./adapter";
import { seratoFieldIds } from "./format";
import { parseSeratoSession, seratoEntriesToDecks } from "./parser";
import { buildSeratoSession, seratoChunk } from "./writer";

const sample = buildSeratoSession([
  {
    title: "Sevaman",
    artist: "Shahzoda",
    album: "Album",
    bpm: 96,
    key: "8A",
    length: "03:34.00",
    path: "Music/Shahzoda/Sevaman.mp3",
    deck: 1,
    startedAtSec: 1_705_312_000,
    endedAtSec: 1_705_312_200,
    played: true,
    playTimeSec: 200,
  },
  {
    title: "Blinding Lights",
    artist: "The Weeknd",
    bpm: 171,
    key: "1A",
    deck: 2,
    startedAtSec: 1_705_312_150,
    played: true,
  },
  {
    title: "Ты моя",
    artist: "Мот \u{1F3B5}",
    deck: 1,
    startedAtSec: 1_705_312_190,
    played: false,
  },
]);

describe("parseSeratoSession", () => {
  const session = parseSeratoSession(sample);

  it("reads the version chunk and all entries", () => {
    expect(session.version).toBe("1.0/Serato Scratch LIVE Review");
    expect(session.entries).toHaveLength(3);
    expect(session.truncated).toBe(false);
  });

  it("maps tags: title artist album bpm key length deck start end played", () => {
    expect(session.entries[0]).toMatchObject({
      row: 1,
      deck: 1,
      startedAt: 1_705_312_000_000,
      endedAt: 1_705_312_200_000,
      played: true,
      playTimeSec: 200,
      path: "Music/Shahzoda/Sevaman.mp3",
      track: {
        title: "Sevaman",
        artist: "Shahzoda",
        album: "Album",
        bpm: 96,
        key: "8A",
        deck: "1",
        durationSec: 214,
      },
    });
    expect(session.entries[2]?.played).toBe(false);
  });

  it("decodes non latin text and surrogate pairs", () => {
    expect(session.entries[2]?.track).toMatchObject({ title: "Ты моя", artist: "Мот \u{1F3B5}" });
  });

  it("tolerates a partially written trailing chunk", () => {
    const cut = sample.subarray(0, sample.length - 5);
    const partial = parseSeratoSession(cut);
    expect(partial.truncated).toBe(true);
    expect(partial.entries).toHaveLength(2);
  });

  it("skips unknown chunks and unknown fields", () => {
    const withUnknown = buildSeratoSession([
      {
        title: "Known",
        artist: "A",
        extraFields: [{ id: 999, data: Uint8Array.of(1, 2, 3) }],
      },
    ]);
    const extra = seratoChunk("zzzz", Uint8Array.of(9, 9, 9));
    const bytes = new Uint8Array(withUnknown.length + extra.length);
    bytes.set(withUnknown);
    bytes.set(extra, withUnknown.length);
    expect(parseSeratoSession(bytes).entries[0]?.track.title).toBe("Known");
  });

  it("does not throw on random bytes or an empty buffer", () => {
    expect(parseSeratoSession(new Uint8Array()).entries).toEqual([]);
    const noise = new Uint8Array(512).map((_, index) => (index * 37 + 11) % 256);
    expect(() => parseSeratoSession(noise)).not.toThrow();
  });

  it("uses documented tag numbers", () => {
    expect(seratoFieldIds).toMatchObject({
      title: 6,
      artist: 7,
      album: 8,
      bpm: 15,
      startTime: 28,
      endTime: 29,
      deck: 31,
      played: 50,
      key: 51,
    });
  });
});

describe("seratoEntriesToDecks", () => {
  it("keeps only the latest open entry per deck", () => {
    const decks = seratoEntriesToDecks(parseSeratoSession(sample).entries);
    expect(decks.map((deck) => `${deck.deck}:${deck.track?.title}:${deck.playing}`).sort()).toEqual(
      ["1:Ты моя:false", "2:Blinding Lights:true"],
    );
  });

  it("empties a deck whose latest entry has ended or was ejected", () => {
    const entries = parseSeratoSession(
      buildSeratoSession([
        { title: "A", artist: "x", deck: 1, startedAtSec: 10, endedAtSec: 20 },
        { title: "B", artist: "x", deck: 2, startedAtSec: 30, ejected: true },
      ]),
    ).entries;
    expect(seratoEntriesToDecks(entries)).toEqual([]);
  });
});

describe("createSeratoAdapter", () => {
  it("tails the newest session file as it grows", async () => {
    const time = createManualTime();
    const fs = createMemoryFileSystem();
    const dir = "/Music/_Serato_/History/Sessions";
    fs.write(`${dir}/1.session`, buildSeratoSession([{ title: "Old", artist: "x", deck: 1 }]), 1);
    fs.write(
      `${dir}/2.session`,
      buildSeratoSession([
        { title: "First", artist: "x", deck: 1, startedAtSec: 100, played: true },
      ]),
      2,
    );
    const adapter = createSeratoAdapter({
      sessionDirectories: [dir],
      fs,
      clock: time,
      timers: time,
    });
    const sink = createRecordingSink();
    await adapter.start(sink);
    expect(sink.decks.get("1")?.track?.title).toBe("First");

    fs.write(
      `${dir}/2.session`,
      buildSeratoSession([
        { title: "First", artist: "x", deck: 1, startedAtSec: 100, endedAtSec: 300, played: true },
        { title: "Second", artist: "x", deck: 2, startedAtSec: 250, played: true },
      ]),
      3,
    );
    time.advance(1000);
    await settle();
    expect(sink.decks.has("1")).toBe(false);
    expect(sink.decks.get("2")?.track?.title).toBe("Second");
    expect(adapter.status().state).toBe("active");
  });

  it("waits while the folder or session is missing", async () => {
    const time = createManualTime();
    const fs = createMemoryFileSystem();
    const adapter = createSeratoAdapter({
      sessionDirectories: ["/x"],
      fs,
      clock: time,
      timers: time,
    });
    await adapter.start(createRecordingSink());
    expect(adapter.status().state).toBe("waiting");
  });
});
