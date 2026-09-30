import { describe, expect, it } from "vitest";
import { trackSchema } from "@joymusic/shared";
import { createFetchStub, jsonResponse, loadFixture } from "../fixtures";
import { ProviderError } from "../types";
import {
  createDeezerProvider,
  deezerPreviewExpiry,
  isDeezerNoData,
  mapDeezerList,
  mapDeezerTrack,
} from "./deezer";

describe("Deezer mapper", () => {
  const search = loadFixture("deezer-search-shahzoda.json");

  it("maps every real search item to a valid Track", () => {
    const hits = mapDeezerList(search);
    expect(hits).toHaveLength(8);
    for (const hit of hits) {
      expect(trackSchema.safeParse(hit.track).success).toBe(true);
      expect(hit.track.id).toBe(`deezer:${hit.track.sourceId}`);
      expect(hit.track.source).toBe("deezer");
    }
  });

  it("maps title, artist, album, artwork, preview and duration of the first item", () => {
    const [first] = mapDeezerList(search);
    expect(first?.track).toEqual({
      id: "deezer:1782899117",
      source: "deezer",
      sourceId: "1782899117",
      title: "Billionaire (Mix)",
      artist: "Shahzoda",
      album: "Yomg'ir",
      artworkUrl:
        "https://cdn-images.dzcdn.net/images/cover/1196650ea9122441c5f53a13493fd6d2/1000x1000-000000-80-0-0.jpg",
      previewUrl: expect.stringContaining("cdnt-preview.dzcdn.net"),
      durationSec: 177,
      explicit: false,
    });
  });

  it("normalizes deezer rank into a 0..1 popularity", () => {
    const [first] = mapDeezerList(search);
    expect(first?.popularity).toBeCloseTo(0.197254, 6);
    for (const hit of mapDeezerList(search)) {
      expect(hit.popularity).toBeGreaterThan(0);
      expect(hit.popularity).toBeLessThanOrEqual(1);
    }
  });

  it("keeps cyrillic titles and marks explicit tracks", () => {
    const chart = mapDeezerList(loadFixture("deezer-chart.json"));
    expect(chart.some((hit) => hit.track.explicit)).toBe(true);
    const cyrillic = mapDeezerList(loadFixture("deezer-search-shahzoda-cyrillic.json"));
    expect(cyrillic.some((hit) => hit.track.title === "Чайхана")).toBe(true);
  });

  it("normalizes decomposed unicode from deezer to composed form", () => {
    const hit = mapDeezerTrack({ id: 9, title: "Чаи\u0306хана", artist: { name: "Шахзода" } });
    expect(hit?.track.title).toBe("Чайхана");
    expect(hit?.track.title).toHaveLength(7);
  });

  it("drops artwork when deezer has no image md5", () => {
    const raw = {
      id: 1,
      title: "No Cover",
      duration: 100,
      rank: 10,
      explicit_lyrics: false,
      preview: "",
      md5_image: "",
      artist: { name: "Someone" },
      album: {
        title: "Album",
        cover_xl: "https://cdn-images.dzcdn.net/images/cover//1000x1000-000000-80-0-0.jpg",
        md5_image: "",
      },
    };
    const hit = mapDeezerTrack(raw);
    expect(hit?.track.artworkUrl).toBeNull();
    expect(hit?.track.previewUrl).toBeNull();
  });

  it("treats zero duration as unknown and skips malformed items", () => {
    const hit = mapDeezerTrack({ id: 2, title: "Zero", duration: 0, artist: { name: "A" } });
    expect(hit?.track.durationSec).toBeNull();
    expect(mapDeezerTrack({ id: "x", title: "Bad" })).toBeNull();
    expect(mapDeezerList({ nothing: true })).toEqual([]);
  });

  it("clips overlong strings instead of failing validation", () => {
    const hit = mapDeezerTrack({
      id: 3,
      title: "T".repeat(500),
      artist: { name: "A".repeat(300) },
    });
    expect(hit?.track.title).toHaveLength(200);
    expect(hit?.track.artist).toHaveLength(200);
  });

  it("extracts preview expiry from the signed url", () => {
    const [first] = mapDeezerList(search);
    expect(deezerPreviewExpiry(first?.track.previewUrl ?? null)).toBe(1790728256 * 1000);
    expect(deezerPreviewExpiry("https://example.com/a.mp3")).toBeNull();
    expect(deezerPreviewExpiry(null)).toBeNull();
  });

  it("recognizes the no-data error payload", () => {
    expect(isDeezerNoData(loadFixture("deezer-error-no-data.json"))).toBe(true);
    expect(isDeezerNoData({ data: [] })).toBe(false);
  });
});

describe("Deezer provider over injected fetch", () => {
  it("searches with an encoded query and limit", async () => {
    const stub = createFetchStub(() => jsonResponse(loadFixture("deezer-search-shahzoda.json")));
    const provider = createDeezerProvider({ fetch: stub.fetch });
    const hits = await provider.search("шахзода & co", 8);
    expect(hits).toHaveLength(8);
    expect(stub.requests[0]?.url).toBe(
      "https://api.deezer.com/search?q=%D1%88%D0%B0%D1%85%D0%B7%D0%BE%D0%B4%D0%B0%20%26%20co&limit=8",
    );
  });

  it("loads the global chart", async () => {
    const stub = createFetchStub(() => jsonResponse(loadFixture("deezer-chart.json")));
    const provider = createDeezerProvider({ fetch: stub.fetch });
    const hits = await provider.chart?.(6);
    expect(hits).toHaveLength(6);
    expect(stub.requests[0]?.url).toBe("https://api.deezer.com/chart/0/tracks?limit=6");
  });

  it("fetches a single track and returns null for the no-data error", async () => {
    const stub = createFetchStub((url) =>
      url.pathname === "/track/1782899117"
        ? jsonResponse(loadFixture("deezer-track-billionaire.json"))
        : jsonResponse(loadFixture("deezer-error-no-data.json")),
    );
    const provider = createDeezerProvider({ fetch: stub.fetch });
    const found = await provider.getTrack?.("1782899117");
    expect(found?.track.title).toBe("Billionaire (Mix)");
    expect(await provider.getTrack?.("0")).toBeNull();
    expect(await provider.getTrack?.("not-a-number")).toBeNull();
  });

  it("resolves the first substantial playlist for a playlist query", async () => {
    const stub = createFetchStub((url) =>
      url.pathname === "/search/playlist"
        ? jsonResponse(loadFixture("deezer-search-playlist.json"))
        : jsonResponse(loadFixture("deezer-playlist-tracks.json")),
    );
    const provider = createDeezerProvider({ fetch: stub.fetch });
    const hits = await provider.playlistTracks?.("uzbek hits", 5);
    expect(hits).toHaveLength(5);
    expect(stub.requests[1]?.url).toBe("https://api.deezer.com/playlist/7786390862/tracks?limit=5");
  });

  it("turns the quota error payload into a retryable ProviderError", async () => {
    const stub = createFetchStub(() =>
      jsonResponse({ error: { type: "Exception", message: "Quota limit exceeded", code: 4 } }),
    );
    const provider = createDeezerProvider({ fetch: stub.fetch });
    const error = await provider.search("x", 5).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).retryable).toBe(true);
  });

  it("marks http 500 as retryable and http 400 as permanent", async () => {
    const failing = (status: number) =>
      createDeezerProvider({
        fetch: createFetchStub(() => new Response("nope", { status })).fetch,
      });
    const serverError = await failing(500)
      .search("x", 5)
      .catch((caught: unknown) => caught);
    const clientError = await failing(400)
      .search("x", 5)
      .catch((caught: unknown) => caught);
    expect((serverError as ProviderError).retryable).toBe(true);
    expect((clientError as ProviderError).retryable).toBe(false);
  });

  it("wraps network failures as retryable", async () => {
    const provider = createDeezerProvider({
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    const error = await provider.search("x", 5).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).retryable).toBe(true);
  });
});
