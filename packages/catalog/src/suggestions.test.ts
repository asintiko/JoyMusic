import { describe, expect, it } from "vitest";
import { suggestionSectionIds } from "@joymusic/shared";
import type { Track } from "@joymusic/shared";
import { createMemoryCache } from "./cache";
import { createCatalog } from "./catalog";
import { sectionSeeds, uzbekArtists } from "./seeds";
import { createFakeProvider, hit, makeTrack } from "./testing";
import { CatalogUnavailableError, ProviderError } from "./types";

const options = { sleep: async () => undefined, random: () => 0.5 };

function echoProvider(overrides: { unknown?: Set<string> } = {}) {
  return createFakeProvider({
    id: "deezer",
    search: async (query) => {
      if (overrides.unknown?.has(query)) return [];
      return [hit(makeTrack({ sourceId: `q-${query}`, artist: query, title: query }), 0.5)];
    },
  });
}

describe("seed data", () => {
  it("covers every seeded suggestion section and nothing else", () => {
    const seeded = suggestionSectionIds.filter((id) => id !== "trending_here" && id !== "dj_picks");
    expect(Object.keys(sectionSeeds).sort()).toEqual([...seeded].sort());
  });

  it("has enough unique, sane queries per section", () => {
    for (const [section, seed] of Object.entries(sectionSeeds)) {
      const queries = seed.entries.map((entry) => entry.query.toLowerCase());
      expect(queries.length, section).toBeGreaterThanOrEqual(15);
      expect(new Set(queries).size, section).toBe(queries.length);
      for (const entry of seed.entries) {
        expect(entry.query.trim(), section).toBe(entry.query);
        expect(entry.query.length, section).toBeGreaterThan(2);
        expect(entry.query.length, section).toBeLessThan(80);
      }
      expect(seed.playlistQueries.length, section).toBeGreaterThan(0);
    }
  });

  it("lists uzbek artists with latin and cyrillic spellings", () => {
    expect(uzbekArtists.length).toBeGreaterThanOrEqual(30);
    const names = uzbekArtists.map((artist) => artist.latin.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
    for (const artist of uzbekArtists) {
      expect(artist.latin).toMatch(/^[A-Za-z' &]+$/);
      expect(artist.cyrillic).toMatch(/^[Ѐ-ӿ ]+$/);
    }
    for (const required of [
      "Shahzoda",
      "Ozoda",
      "Rayhon",
      "Konsta",
      "Yulduz Usmonova",
      "Bojalar",
    ]) {
      expect(names).toContain(required.toLowerCase());
    }
  });

  it("gives every uzbek artist a cyrillic alternative in the uz_hits seeds", () => {
    const artistEntries = sectionSeeds.uz_hits.entries.filter((entry) => entry.kind === "artist");
    expect(artistEntries).toHaveLength(uzbekArtists.length);
    for (const entry of artistEntries) expect(entry.alternatives?.[0]).toMatch(/^[Ѐ-ӿ ]+$/);
  });
});

describe("suggestions", () => {
  it("returns nothing for dj_picks because the api owns that section", async () => {
    const provider = echoProvider();
    const catalog = createCatalog({ providers: [provider], ...options });
    expect(await catalog.suggestions("dj_picks")).toEqual([]);
    expect(provider.searchCalls).toEqual([]);
  });

  it("falls back to the chart for trending_here and caches it", async () => {
    let chartCalls = 0;
    const chart = [1, 2, 3].map((id) =>
      hit(makeTrack({ sourceId: String(id), title: `Hit ${id}`, artist: `Star ${id}` })),
    );
    const provider = createFakeProvider({
      id: "deezer",
      chart: async () => {
        chartCalls += 1;
        return chart;
      },
    });
    const catalog = createCatalog({ providers: [provider], ...options });
    const first = await catalog.suggestions("trending_here", 2);
    const second = await catalog.suggestions("trending_here", 10);
    expect(first.map((track) => track.title)).toEqual(["Hit 1", "Hit 2"]);
    expect(second).toHaveLength(3);
    expect(chartCalls).toBe(1);
  });

  it("raises CatalogUnavailableError when the chart provider fails and nothing is cached", async () => {
    const provider = createFakeProvider({
      id: "deezer",
      chart: async () => {
        throw new ProviderError("down", { retryable: false, status: 400 });
      },
    });
    const catalog = createCatalog({ providers: [provider], ...options, retryAttempts: 1 });
    await expect(catalog.suggestions("trending_here")).rejects.toBeInstanceOf(
      CatalogUnavailableError,
    );
  });

  it("resolves seeded sections lazily in batches and preserves seed order", async () => {
    const provider = echoProvider();
    const catalog = createCatalog({ providers: [provider], ...options });
    const first = await catalog.suggestions("uz_hits", 5);
    expect(first).toHaveLength(5);
    expect(provider.searchCalls).toHaveLength(8);
    const expected = sectionSeeds.uz_hits.entries.slice(0, 5).map((entry) => entry.query);
    expect(first.slice(0, 5).map((track: Track) => track.title)).toEqual(expected);

    await catalog.suggestions("uz_hits", 5);
    expect(provider.searchCalls).toHaveLength(8);

    const more = await catalog.suggestions("uz_hits", 12);
    expect(more.length).toBeGreaterThanOrEqual(12);
    expect(provider.searchCalls.length).toBeGreaterThan(8);
    expect(provider.searchCalls.length).toBeLessThanOrEqual(16);
  });

  it("skips entries that do not resolve and continues with the rest", async () => {
    const skipped = sectionSeeds.club.entries[1]?.query ?? "";
    const provider = echoProvider({ unknown: new Set([skipped]) });
    const catalog = createCatalog({ providers: [provider], ...options });
    const tracks = await catalog.suggestions("club", 10);
    expect(tracks.some((track) => track.title === skipped)).toBe(false);
    expect(tracks.length).toBeGreaterThanOrEqual(10);
  });

  it("tries the cyrillic spelling when the latin artist query resolves nothing", async () => {
    const latinNames = new Set(uzbekArtists.map((artist) => artist.latin));
    const provider = createFakeProvider({
      id: "deezer",
      search: async (query) => {
        if (latinNames.has(query)) return [];
        return [hit(makeTrack({ sourceId: `q-${query}`, artist: query, title: query }))];
      },
    });
    const catalog = createCatalog({ providers: [provider], ...options });
    const tracks = await catalog.suggestions("uz_hits", 200);
    expect(tracks.some((track) => track.artist === "Озода")).toBe(true);
    expect(tracks.some((track) => track.artist === "Шахзода")).toBe(true);
  });

  it("caps tracks per artist and never repeats a song within a section", async () => {
    const provider = createFakeProvider({
      id: "deezer",
      search: async () =>
        [1, 2, 3, 4].map((index) =>
          hit(makeTrack({ sourceId: `s${index}`, artist: "Only Artist", title: `Song ${index}` })),
        ),
    });
    const catalog = createCatalog({ providers: [provider], ...options });
    const tracks = await catalog.suggestions("slow", 50);
    expect(tracks.length).toBeLessThanOrEqual(2);
    expect(new Set(tracks.map((track) => track.id)).size).toBe(tracks.length);
  });

  it("tops up from playlists when curated queries come back empty", async () => {
    const provider = createFakeProvider({
      id: "deezer",
      search: async () => [],
      playlistTracks: async () =>
        [1, 2, 3].map((index) =>
          hit(
            makeTrack({ sourceId: `p${index}`, artist: `Party ${index}`, title: `Cake ${index}` }),
          ),
        ),
    });
    const catalog = createCatalog({ providers: [provider], ...options });
    const tracks = await catalog.suggestions("birthday", 20);
    expect(tracks.map((track) => track.title).sort()).toEqual(["Cake 1", "Cake 2", "Cake 3"]);
  });

  it("raises CatalogUnavailableError when a seeded section cannot be resolved at all", async () => {
    const provider = createFakeProvider({
      id: "deezer",
      search: async () => {
        throw new ProviderError("down", { retryable: false, status: 500 });
      },
    });
    const catalog = createCatalog({ providers: [provider], ...options, retryAttempts: 1 });
    await expect(catalog.suggestions("ru_pop")).rejects.toBeInstanceOf(CatalogUnavailableError);
  });

  it("keeps resolved sections across catalog instances that share a cache", async () => {
    const cache = createMemoryCache();
    const provider = echoProvider();
    await createCatalog({ providers: [provider], cache, ...options }).suggestions("slow", 5);
    const callsAfterFirst = provider.searchCalls.length;
    const secondProvider = echoProvider();
    const tracks = await createCatalog({
      providers: [secondProvider],
      cache,
      ...options,
    }).suggestions("slow", 5);
    expect(tracks).toHaveLength(5);
    expect(callsAfterFirst).toBe(8);
    expect(secondProvider.searchCalls).toHaveLength(0);
  });

  it("refreshes expiring previews of cached section tracks", async () => {
    let time = 1_000_000_000_000;
    const preview = (tag: string) =>
      `https://cdnt-preview.dzcdn.net/${tag}.mp3?hdnea=exp=${time / 1000 + 900}~acl=/x*~hmac=abc`;
    const provider = createFakeProvider({
      id: "deezer",
      chart: async () => [
        hit(makeTrack({ sourceId: "1", title: "Hit", artist: "Star", previewUrl: preview("old") })),
      ],
      getTrack: async () =>
        hit(makeTrack({ sourceId: "1", title: "Hit", artist: "Star", previewUrl: preview("new") })),
    });
    const catalog = createCatalog({
      providers: [provider],
      ...options,
      now: () => time,
      cache: createMemoryCache({ now: () => time }),
    });
    const first = await catalog.suggestions("trending_here", 5);
    expect(first[0]?.previewUrl).toContain("/old.mp3");
    time += 20 * 60_000;
    const cachedAfterExpiry = await catalog.suggestions("trending_here", 5);
    expect(cachedAfterExpiry[0]?.previewUrl).toContain("/new.mp3");
    const again = await catalog.suggestions("trending_here", 5);
    expect(again[0]?.previewUrl).toContain("/new.mp3");
  });
});
