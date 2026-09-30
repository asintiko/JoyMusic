import { describe, expect, it } from "vitest";
import {
  settle,
  createManualTime,
  createMemoryFileSystem,
  createRecordingSink,
} from "../../testing";
import { createVirtualDjAdapter } from "./adapter";
import { parseVirtualDjHistory } from "./parser";

const history = [
  "#EXTM3U",
  "#EXTVDJ:<time>1705312000</time><lastplaytime>1705312001</lastplaytime><artist>Shahzoda</artist><title>Sevaman</title><songlength>214.5</songlength><bpm>96</bpm><key>8A</key>",
  "C:\\Music\\Shahzoda - Sevaman.mp3",
  "#EXTINF:200,The Weeknd - Blinding Lights",
  "/Users/dj/Music/blinding.mp3",
  "/Users/dj/Music/Мот - Ты моя.mp3",
  "#EXTVDJ:<artist>Only Tag</artist><title>No Path Yet</title>",
].join("\r\n");

describe("parseVirtualDjHistory", () => {
  const entries = parseVirtualDjHistory(history);

  it("reads EXTVDJ tags", () => {
    expect(entries[0]?.track).toEqual({
      title: "Sevaman",
      artist: "Shahzoda",
      bpm: 96,
      key: "8A",
      startedAt: 1705312001000,
      durationSec: 215,
    });
    expect(entries[0]?.path).toBe("C:\\Music\\Shahzoda - Sevaman.mp3");
  });

  it("reads EXTINF lines", () => {
    expect(entries[1]?.track).toMatchObject({
      title: "Blinding Lights",
      artist: "The Weeknd",
      durationSec: 200,
    });
  });

  it("derives names from the file name and keeps a trailing entry without a path", () => {
    expect(entries[2]?.track).toMatchObject({ artist: "Мот", title: "Ты моя" });
    expect(entries[3]?.track.title).toBe("No Path Yet");
    expect(entries).toHaveLength(4);
  });

  it("tolerates garbage", () => {
    expect(parseVirtualDjHistory("")).toEqual([]);
    expect(parseVirtualDjHistory("#EXTM3U\n#EXTVDJ:<broken\n\u0000\u0001")).toEqual([]);
  });
});

describe("createVirtualDjAdapter", () => {
  it("tails the newest history file and picks the last entry", async () => {
    const time = createManualTime();
    const fs = createMemoryFileSystem();
    const dir = "/vdj/History";
    fs.write(`${dir}/2024-01-01.m3u`, "#EXTINF:100,Old - Old Song\nold.mp3\n", 1);
    fs.write(`${dir}/2024-01-02.m3u`, "#EXTINF:100,A - One\none.mp3\n", 2);
    const adapter = createVirtualDjAdapter({
      historyDirectories: ["/missing", dir],
      fs,
      clock: time,
      timers: time,
      pollMs: 1000,
    });
    const sink = createRecordingSink();
    await adapter.start(sink);
    expect(sink.calls.filter((call) => call.startsWith("track:"))).toEqual(["track:One"]);
    expect(adapter.status().state).toBe("active");

    time.advance(1000);
    await settle();
    expect(sink.calls.filter((call) => call.startsWith("track:"))).toHaveLength(1);

    fs.write(
      `${dir}/2024-01-02.m3u`,
      "#EXTINF:100,A - One\none.mp3\n#EXTINF:90,B - Two\ntwo.mp3\n",
      3,
    );
    time.advance(1000);
    await settle();
    expect(sink.calls.filter((call) => call.startsWith("track:"))).toEqual([
      "track:One",
      "track:Two",
    ]);
    await adapter.stop();
    expect(time.pending()).toBe(0);
  });

  it("waits when the folder is missing", async () => {
    const time = createManualTime();
    const adapter = createVirtualDjAdapter({
      historyDirectories: ["/nope"],
      fs: createMemoryFileSystem(),
      clock: time,
      timers: time,
    });
    await adapter.start(createRecordingSink());
    expect(adapter.status().state).toBe("waiting");
  });

  it("supports the now playing text file option", async () => {
    const time = createManualTime();
    const fs = createMemoryFileSystem();
    fs.write("/tmp/nowplaying.txt", "Artist X - Title Y", 1);
    const adapter = createVirtualDjAdapter({
      historyDirectories: ["/nope"],
      nowPlayingFile: { path: "/tmp/nowplaying.txt" },
      fs,
      clock: time,
      timers: time,
    });
    const sink = createRecordingSink();
    await adapter.start(sink);
    expect(sink.calls).toContain("track:Title Y");
    expect(adapter.status().state).toBe("active");
  });
});
