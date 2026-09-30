import { describe, expect, it } from "vitest";
import {
  settle,
  createManualTime,
  createMemoryFileSystem,
  createRecordingSink,
} from "../../testing";
import { createTextFileAdapter } from "./adapter";
import { compileTrackTemplate, splitArtistTitle } from "./template";

describe("compileTrackTemplate", () => {
  it("parses the default artist - title layout", () => {
    expect(compileTrackTemplate("{artist} - {title}").parse("Daft Punk - One More Time")).toEqual({
      title: "One More Time",
      artist: "Daft Punk",
    });
  });

  it("keeps hyphens inside the title", () => {
    expect(compileTrackTemplate("{artist} - {title}").parse("A - B - C")).toMatchObject({
      artist: "A",
      title: "B - C",
    });
  });

  it("supports extra fields and custom literals", () => {
    const template = compileTrackTemplate("[{bpm}] {title} by {artist} ({key})");
    expect(template.parse("[124.5] Song by Someone (5A)")).toEqual({
      title: "Song",
      artist: "Someone",
      bpm: 124.5,
      key: "5A",
    });
  });

  it("uses the last non-empty line for single line templates", () => {
    expect(
      compileTrackTemplate("{artist} - {title}").parse("A - One\r\nB - Two\r\n\r\n"),
    ).toMatchObject({
      title: "Two",
    });
  });

  it("supports multiline templates", () => {
    expect(compileTrackTemplate("{title}\n{artist}").parse("Song\nBand\n")).toMatchObject({
      title: "Song",
      artist: "Band",
    });
  });

  it("returns null for non matching text and rejects bad templates", () => {
    expect(compileTrackTemplate("{artist} - {title}").parse("no separator")).toBeNull();
    expect(() => compileTrackTemplate("{artist}")).toThrow();
    expect(() => compileTrackTemplate("{title} {nope}")).toThrow();
    expect(() => compileTrackTemplate("{title} {title}")).toThrow();
  });
});

describe("splitArtistTitle", () => {
  it("splits on common dashes and falls back to title only", () => {
    expect(splitArtistTitle("A – B")).toEqual({ artist: "A", title: "B" });
    expect(splitArtistTitle("Just a title")).toEqual({ artist: "", title: "Just a title" });
    expect(splitArtistTitle("  ")).toBeNull();
  });
});

describe("createTextFileAdapter", () => {
  it("reacts to file changes and empty files", async () => {
    const time = createManualTime();
    const fs = createMemoryFileSystem();
    const adapter = createTextFileAdapter({ path: "/np.txt", fs, clock: time, timers: time });
    const sink = createRecordingSink();
    await adapter.start(sink);
    expect(adapter.status().state).toBe("waiting");

    fs.write("/np.txt", "A - One", 1);
    time.advance(1000);
    await settle();
    expect(adapter.status().state).toBe("active");
    expect(sink.calls).toContain("track:One");

    time.advance(1000);
    await settle();
    expect(sink.calls.filter((call) => call.startsWith("track:"))).toHaveLength(1);

    fs.write("/np.txt", "", 2);
    time.advance(1000);
    await settle();
    expect(sink.calls.at(-2)).toBe("track:-");
  });
});
