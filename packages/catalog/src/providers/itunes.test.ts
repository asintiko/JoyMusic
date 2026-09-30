import { describe, expect, it } from "vitest";
import { trackSchema } from "@joymusic/shared";
import { createFetchStub, jsonResponse, loadFixture } from "../fixtures";
import {
  createItunesProvider,
  mapItunesList,
  mapItunesTrack,
  upgradeItunesArtwork,
} from "./itunes";

describe("iTunes mapper", () => {
  const search = loadFixture("itunes-search-shahzoda.json");

  it("maps every real search item to a valid Track", () => {
    const hits = mapItunesList(search);
    expect(hits).toHaveLength(6);
    for (const hit of hits) {
      expect(trackSchema.safeParse(hit.track).success).toBe(true);
      expect(hit.track.id).toBe(`itunes:${hit.track.sourceId}`);
      expect(hit.popularity).toBeNull();
    }
  });

  it("upgrades artwork to 600x600 and rounds duration from milliseconds", () => {
    const [first] = mapItunesList(search);
    expect(first?.track).toEqual({
      id: "itunes:1628314144",
      source: "itunes",
      sourceId: "1628314144",
      title: "Hayot Ayt",
      artist: "Shakhzoda",
      album: "Baxtliman",
      artworkUrl:
        "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/5f/e2/fd/5fe2fda0-7278-a3a5-76fb-3400ca342112/cover.jpg/600x600bb.jpg",
      previewUrl: expect.stringContaining("audio-ssl.itunes.apple.com"),
      durationSec: 198,
      explicit: false,
    });
  });

  it("rewrites various artwork size suffixes", () => {
    expect(upgradeItunesArtwork("https://x/a/cover.jpg/100x100bb.jpg")).toBe(
      "https://x/a/cover.jpg/600x600bb.jpg",
    );
    expect(upgradeItunesArtwork("https://x/a/cover.jpg/60x60bb.png")).toBe(
      "https://x/a/cover.jpg/600x600bb.png",
    );
    expect(upgradeItunesArtwork("https://x/a/100x100.jpg", 300)).toBe("https://x/a/300x300bb.jpg");
    expect(upgradeItunesArtwork("https://x/a/cover.jpg")).toBe("https://x/a/cover.jpg");
  });

  it("maps explicit flag and skips non-song results", () => {
    const explicit = mapItunesTrack({
      wrapperType: "track",
      kind: "song",
      trackId: 5,
      artistName: "A",
      trackName: "B",
      trackExplicitness: "explicit",
    });
    expect(explicit?.track.explicit).toBe(true);
    expect(explicit?.track.artworkUrl).toBeNull();
    expect(explicit?.track.previewUrl).toBeNull();
    expect(explicit?.track.durationSec).toBeNull();
    expect(
      mapItunesTrack({
        wrapperType: "collection",
        kind: "album",
        trackId: 6,
        artistName: "A",
        trackName: "B",
      }),
    ).toBeNull();
    expect(
      mapItunesTrack({ kind: "music-video", trackId: 7, artistName: "A", trackName: "B" }),
    ).toBeNull();
    expect(mapItunesList({})).toEqual([]);
  });
});

describe("iTunes provider over injected fetch", () => {
  it("searches songs with media, limit and country", async () => {
    const stub = createFetchStub(() => jsonResponse(loadFixture("itunes-search-shahzoda.json")));
    const provider = createItunesProvider({ fetch: stub.fetch, country: "UZ" });
    const hits = await provider.search("Shakhzoda", 6);
    expect(hits).toHaveLength(6);
    expect(stub.requests[0]?.url).toBe(
      "https://itunes.apple.com/search?term=Shakhzoda&entity=song&media=music&limit=6&country=UZ",
    );
  });

  it("looks a track up by id", async () => {
    const stub = createFetchStub(() => jsonResponse(loadFixture("itunes-lookup-hayot-ayt.json")));
    const provider = createItunesProvider({ fetch: stub.fetch });
    const found = await provider.getTrack?.("1628314144");
    expect(found?.track.title).toBe("Hayot Ayt");
    expect(await provider.getTrack?.("1")).toBeNull();
    expect(await provider.getTrack?.("abc")).toBeNull();
  });

  it("classifies http failures", async () => {
    const provider = createItunesProvider({
      fetch: createFetchStub(() => new Response("", { status: 503 })).fetch,
    });
    const error = await provider.search("x", 3).catch((caught: unknown) => caught);
    expect((error as { retryable: boolean }).retryable).toBe(true);
  });
});
