import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryCache } from "./cache";
import { createCatalog, normalizeQuery } from "./catalog";
import { createFetchStub, jsonResponse, loadFixture } from "./fixtures";
import { createFakeProvider, hit, makeTrack } from "./testing";
import { CatalogUnavailableError, ProviderError } from "./types";

const instantSleep = async () => undefined;

const baseOptions = {
  sleep: instantSleep,
  random: () => 0.5,
};

describe("normalizeQuery", () => {
  it("trims, collapses whitespace, composes unicode and caps the length", () => {
    expect(normalizeQuery("  shahzoda \t  habibi  ")).toBe("shahzoda habibi");
    expect(normalizeQuery("Чайхана")).toBe("Чайхана");
    expect(normalizeQuery("a".repeat(500))).toHaveLength(120);
  });
});

describe("search with recorded provider payloads", () => {
  const routeFixtures = () =>
    createFetchStub((url) => {
      if (url.hostname === "api.deezer.com") {
        return jsonResponse(loadFixture("deezer-search-shahzoda.json"));
      }
      return jsonResponse(loadFixture("itunes-search-shahzoda.json"));
    });

  it("merges deezer and itunes results, ranks the requested artist first and dedupes", async () => {
    const stub = routeFixtures();
    const catalog = createCatalog({ ...baseOptions, fetch: stub.fetch });
    const tracks = await catalog.search("shahzoda", 30);
    expect(tracks.length).toBeGreaterThan(8);
    const sources = new Set(tracks.map((track) => track.source));
    expect(sources).toEqual(new Set(["deezer", "itunes"]));
    const ids = tracks.map((track) => track.id);
    expect(new Set(ids).size).toBe(ids.length);
    const leading = tracks.slice(0, 6);
    expect(leading.every((track) => /sha[hk]?[hk]?zoda/i.test(track.artist))).toBe(true);
    const faydee = tracks.findIndex((track) => track.artist === "Faydee");
    expect(faydee === -1 || faydee > 6).toBe(true);
  });

  it("returns a trimmed list respecting the limit and validated tracks", async () => {
    const catalog = createCatalog({ ...baseOptions, fetch: routeFixtures().fetch });
    const tracks = await catalog.search("shahzoda", 5);
    expect(tracks).toHaveLength(5);
    for (const track of tracks) {
      expect(track.id).toBe(`${track.source}:${track.sourceId}`);
    }
  });

  it("returns nothing for blank or one-letter queries without calling providers", async () => {
    const stub = routeFixtures();
    const catalog = createCatalog({ ...baseOptions, fetch: stub.fetch });
    expect(await catalog.search("   ")).toEqual([]);
    expect(await catalog.search("a")).toEqual([]);
    expect(stub.requests).toHaveLength(0);
  });
});

describe("variants and rounds", () => {
  it("only fans out to variants when the first round has too few strong matches", async () => {
    const strong = [1, 2, 3].map((index) =>
      hit(
        makeTrack({ sourceId: String(index), title: `Habibi ${index}`, artist: "Shahzoda" }),
        0.3,
      ),
    );
    const deezer = createFakeProvider({ id: "deezer", search: async () => strong });
    const catalog = createCatalog({ ...baseOptions, providers: [deezer] });
    await catalog.search("shahzoda");
    expect(deezer.searchCalls).toEqual(["shahzoda"]);
  });

  it("queries alternate spellings when the original finds nothing", async () => {
    const deezer = createFakeProvider({
      id: "deezer",
      search: async (query) =>
        query === "shakhzoda"
          ? [hit(makeTrack({ sourceId: "7", title: "Hayot Ayt", artist: "Shakhzoda" }), 0.2)]
          : [],
    });
    const catalog = createCatalog({ ...baseOptions, providers: [deezer], maxVariants: 5 });
    const tracks = await catalog.search("shahzoda");
    expect(deezer.searchCalls[0]).toBe("shahzoda");
    expect(deezer.searchCalls).toContain("shakhzoda");
    expect(tracks.map((track) => track.sourceId)).toEqual(["7"]);
  });

  it("finds cyrillic-titled tracks from a latin query through the cyrillic variant", async () => {
    const deezer = createFakeProvider({
      id: "deezer",
      search: async (query) =>
        query === "шахзода"
          ? [hit(makeTrack({ sourceId: "8", title: "Чайхана", artist: "Shahzoda" }))]
          : [],
    });
    const catalog = createCatalog({ ...baseOptions, providers: [deezer], maxVariants: 8 });
    const tracks = await catalog.search("shahzoda");
    expect(tracks[0]?.title).toBe("Чайхана");
  });

  it("runs every variant immediately in parallel mode", async () => {
    const deezer = createFakeProvider({
      id: "deezer",
      search: async () => [hit(makeTrack({ title: "Habibi", artist: "Shahzoda" }))],
    });
    const catalog = createCatalog({
      ...baseOptions,
      providers: [deezer],
      variantStrategy: "parallel",
      maxVariants: 3,
    });
    await catalog.search("shahzoda");
    expect(deezer.searchCalls).toHaveLength(3);
  });
});

describe("ranking pipeline", () => {
  it("demotes karaoke and cover results below originals", async () => {
    const deezer = createFakeProvider({
      id: "deezer",
      search: async () => [
        hit(
          makeTrack({ sourceId: "1", title: "Scream (Karaoke Version)", artist: "Sergey Lazarev" }),
          0.9,
        ),
        hit(makeTrack({ sourceId: "2", title: "Scream (Cover)", artist: "Someone Else" }), 0.8),
        hit(makeTrack({ sourceId: "3", title: "Scream", artist: "Sergey Lazarev" }), 0.4),
      ],
    });
    const catalog = createCatalog({ ...baseOptions, providers: [deezer] });
    const tracks = await catalog.search("sergey lazarev scream");
    expect(tracks.map((track) => track.sourceId)).toEqual(["3", "1", "2"]);
  });

  it("dedupes the same song from both providers keeping the richer entry", async () => {
    const deezer = createFakeProvider({
      id: "deezer",
      search: async () => [
        hit(
          makeTrack({
            source: "deezer",
            sourceId: "1",
            title: "Habibi",
            artist: "Shahzoda",
            previewUrl: null,
          }),
          0.3,
        ),
      ],
    });
    const itunes = createFakeProvider({
      id: "itunes",
      search: async () => [
        hit(
          makeTrack({
            source: "itunes",
            sourceId: "2",
            title: "Habibi",
            artist: "Shakhzoda",
            previewUrl: "https://preview.example/itunes.m4a",
          }),
        ),
      ],
    });
    const catalog = createCatalog({ ...baseOptions, providers: [deezer, itunes] });
    const tracks = await catalog.search("habibi");
    expect(tracks).toHaveLength(1);
    expect(tracks[0]?.id).toBe("itunes:2");
  });
});

describe("resilience", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("answers from the healthy provider when the other one hangs past the timeout", async () => {
    const slow = createFakeProvider({
      id: "deezer",
      search: () => new Promise(() => undefined),
    });
    const fast = createFakeProvider({
      id: "itunes",
      search: async () => [
        hit(makeTrack({ source: "itunes", sourceId: "5", title: "Habibi", artist: "Shahzoda" })),
      ],
    });
    const catalog = createCatalog({ providers: [slow, fast], random: () => 0.5 });
    const pending = catalog.search("habibi");
    await vi.advanceTimersByTimeAsync(3000);
    expect(slow.searchCalls).toEqual(["habibi"]);
    const tracks = await pending;
    expect(tracks.map((track) => track.id)).toEqual(["itunes:5"]);
    const status = catalog.providerStatus().find((entry) => entry.id === "deezer");
    expect(status?.lastError).toBe("timeout");
    expect(status?.consecutiveFailures).toBe(1);
  });

  it("retries a transient failure with backoff before giving up on a provider", async () => {
    let calls = 0;
    const sleeps: number[] = [];
    const flaky = createFakeProvider({
      id: "deezer",
      search: async () => {
        calls += 1;
        if (calls === 1) throw new ProviderError("quota", { retryable: true });
        return [hit(makeTrack({ title: "Habibi", artist: "Shahzoda" }))];
      },
    });
    const catalog = createCatalog({
      providers: [flaky],
      random: () => 0.5,
      sleep: async (ms) => void sleeps.push(ms),
      maxVariants: 1,
    });
    const tracks = await catalog.search("habibi");
    expect(tracks).toHaveLength(1);
    expect(calls).toBe(2);
    expect(sleeps).toEqual([75]);
  });

  it("opens the circuit after repeated failures and probes again after the cooldown", async () => {
    let time = 0;
    let healthy = false;
    const provider = createFakeProvider({
      id: "deezer",
      search: async () => {
        if (!healthy) throw new ProviderError("down", { retryable: true, status: 503 });
        return [hit(makeTrack({ title: "Habibi", artist: "Shahzoda" }))];
      },
    });
    const backup = createFakeProvider({ id: "itunes", search: async () => [] });
    const catalog = createCatalog({
      providers: [provider, backup],
      ...baseOptions,
      now: () => time,
      cache: createMemoryCache({ now: () => time }),
      breakerFailureThreshold: 3,
      breakerCooldownMs: 30_000,
      retryAttempts: 1,
      variantStrategy: "parallel",
      maxVariants: 1,
    });
    for (let index = 0; index < 3; index += 1) {
      await catalog.search(`query number ${index}`);
      time += 1;
    }
    expect(catalog.providerStatus()[0]?.breaker).toBe("open");
    const callsWhenOpen = provider.searchCalls.length;
    await catalog.search("another query");
    expect(provider.searchCalls).toHaveLength(callsWhenOpen);
    time += 30_000;
    healthy = true;
    const tracks = await catalog.search("habibi");
    expect(tracks).toHaveLength(1);
    expect(provider.searchCalls).toHaveLength(callsWhenOpen + 1);
    expect(catalog.providerStatus()[0]?.breaker).toBe("closed");
  });

  it("throws CatalogUnavailableError and does not cache when every provider fails", async () => {
    let fail = true;
    const provider = createFakeProvider({
      id: "deezer",
      search: async () => {
        if (fail) throw new ProviderError("down", { retryable: false, status: 500 });
        return [hit(makeTrack({ title: "Habibi", artist: "Shahzoda" }))];
      },
    });
    const catalog = createCatalog({ providers: [provider], ...baseOptions, retryAttempts: 1 });
    await expect(catalog.search("habibi")).rejects.toBeInstanceOf(CatalogUnavailableError);
    fail = false;
    const tracks = await catalog.search("habibi");
    expect(tracks).toHaveLength(1);
  });

  it("does not treat a permanent client error as a circuit-breaking failure", async () => {
    const provider = createFakeProvider({
      id: "deezer",
      search: async () => {
        throw new ProviderError("bad query", { retryable: false, status: 400 });
      },
    });
    const catalog = createCatalog({
      providers: [provider],
      ...baseOptions,
      breakerFailureThreshold: 2,
      retryAttempts: 1,
    });
    for (let index = 0; index < 4; index += 1) {
      await expect(catalog.search(`query ${index}`)).rejects.toBeInstanceOf(
        CatalogUnavailableError,
      );
    }
    expect(catalog.providerStatus()[0]?.breaker).toBe("closed");
    expect(provider.searchCalls).toHaveLength(4);
  });

  it("abandons waiting when the caller aborts", async () => {
    const provider = createFakeProvider({
      id: "deezer",
      search: () => new Promise(() => undefined),
    });
    const catalog = createCatalog({ providers: [provider], ...baseOptions });
    const controller = new AbortController();
    const pending = catalog.search("habibi", 10, controller.signal);
    const assertion = expect(pending).rejects.toThrow("Aborted");
    controller.abort();
    await assertion;
  });
});

describe("caching", () => {
  it("serves repeated searches from cache until the ttl expires", async () => {
    let time = 0;
    const provider = createFakeProvider({
      id: "deezer",
      search: async () => [hit(makeTrack({ title: "Habibi", artist: "Shahzoda" }))],
    });
    const catalog = createCatalog({
      providers: [provider],
      ...baseOptions,
      now: () => time,
      cache: createMemoryCache({ now: () => time }),
      searchTtlMs: 60_000,
      maxVariants: 1,
    });
    await catalog.search("habibi");
    await catalog.search("  Habibi ");
    expect(provider.searchCalls).toHaveLength(1);
    time += 59_999;
    await catalog.search("habibi");
    expect(provider.searchCalls).toHaveLength(1);
    time += 1;
    await catalog.search("habibi");
    expect(provider.searchCalls).toHaveLength(2);
  });

  it("shares one upstream request between concurrent identical searches", async () => {
    let resolveSearch: (value: ReturnType<typeof hit>[]) => void = () => undefined;
    const provider = createFakeProvider({
      id: "deezer",
      search: () =>
        new Promise((resolve) => {
          resolveSearch = resolve;
        }),
    });
    const catalog = createCatalog({ providers: [provider], ...baseOptions, maxVariants: 1 });
    const first = catalog.search("habibi");
    const second = catalog.search("habibi");
    await vi.waitFor(() => expect(provider.searchCalls).toHaveLength(1));
    resolveSearch([hit(makeTrack({ title: "Habibi", artist: "Shahzoda" }))]);
    const [one, two] = await Promise.all([first, second]);
    expect(one).toEqual(two);
    expect(provider.searchCalls).toHaveLength(1);
  });

  it("keeps working when the cache backend throws", async () => {
    const provider = createFakeProvider({
      id: "deezer",
      search: async () => [hit(makeTrack({ title: "Habibi", artist: "Shahzoda" }))],
    });
    const brokenCache = {
      get: async () => {
        throw new Error("redis down");
      },
      set: async () => {
        throw new Error("redis down");
      },
      delete: async () => undefined,
    };
    const catalog = createCatalog({ providers: [provider], ...baseOptions, cache: brokenCache });
    expect(await catalog.search("habibi")).toHaveLength(1);
  });
});

describe("previews that expire", () => {
  const expiringPreview = (expiresAtSeconds: number, tag = "a") =>
    `https://cdnt-preview.dzcdn.net/api/1/1/${tag}.mp3?hdnea=exp=${expiresAtSeconds}~acl=/x*~hmac=abc`;

  it("refreshes a stale deezer preview on a cached search through getTrack", async () => {
    let time = 1_000_000_000_000;
    const stale = makeTrack({
      sourceId: "1",
      title: "Habibi",
      artist: "Shahzoda",
      previewUrl: expiringPreview(time / 1000 + 900),
    });
    const provider = createFakeProvider({
      id: "deezer",
      search: async () => [hit(stale)],
      getTrack: async () =>
        hit({ ...stale, previewUrl: expiringPreview(time / 1000 + 900, "fresh") }),
    });
    const catalog = createCatalog({
      providers: [provider],
      ...baseOptions,
      now: () => time,
      cache: createMemoryCache({ now: () => time }),
      searchTtlMs: 10 * 60 * 60_000,
      maxVariants: 1,
    });
    const first = await catalog.search("habibi");
    expect(first[0]?.previewUrl).toContain("/a.mp3");
    expect(provider.getTrackCalls).toEqual([]);
    time += 15 * 60_000;
    const second = await catalog.search("habibi");
    expect(provider.getTrackCalls).toEqual(["1"]);
    expect(second[0]?.previewUrl).toContain("/fresh.mp3");
    const third = await catalog.search("habibi");
    expect(provider.getTrackCalls).toEqual(["1"]);
    expect(third[0]?.previewUrl).toContain("/fresh.mp3");
  });

  it("drops the preview when a stale preview cannot be refreshed", async () => {
    let time = 1_000_000_000_000;
    const stale = makeTrack({
      sourceId: "1",
      title: "Habibi",
      artist: "Shahzoda",
      previewUrl: expiringPreview(time / 1000 + 900),
    });
    const provider = createFakeProvider({
      id: "deezer",
      search: async () => [hit(stale)],
      getTrack: async () => {
        throw new ProviderError("down", { retryable: false });
      },
    });
    const catalog = createCatalog({
      providers: [provider],
      ...baseOptions,
      now: () => time,
      cache: createMemoryCache({ now: () => time }),
      searchTtlMs: 10 * 60 * 60_000,
      maxVariants: 1,
    });
    await catalog.search("habibi");
    time += 15 * 60_000;
    const again = await catalog.search("habibi");
    expect(again[0]?.previewUrl).toBeNull();
  });
});

describe("getTrack and refreshPreview", () => {
  it("routes by the source prefix and caches the lookup", async () => {
    const deezer = createFakeProvider({
      id: "deezer",
      getTrack: async (sourceId) => hit(makeTrack({ sourceId, title: "Looked Up" })),
    });
    const itunes = createFakeProvider({ id: "itunes" });
    const catalog = createCatalog({ providers: [deezer, itunes], ...baseOptions });
    const track = await catalog.getTrack("deezer:42");
    expect(track?.title).toBe("Looked Up");
    await catalog.getTrack("deezer:42");
    expect(deezer.getTrackCalls).toEqual(["42"]);
  });

  it("returns null for unknown sources, malformed ids and manual tracks", async () => {
    const catalog = createCatalog({
      providers: [createFakeProvider({ id: "deezer", getTrack: async () => null })],
      ...baseOptions,
    });
    expect(await catalog.getTrack("itunes:1")).toBeNull();
    expect(await catalog.getTrack("manual:abc")).toBeNull();
    expect(await catalog.getTrack("nonsense")).toBeNull();
    expect(await catalog.getTrack(":1")).toBeNull();
    expect(await catalog.getTrack("deezer:")).toBeNull();
    expect(await catalog.getTrack("deezer:404")).toBeNull();
  });

  it("refreshPreview bypasses the cache", async () => {
    let version = 0;
    const deezer = createFakeProvider({
      id: "deezer",
      getTrack: async (sourceId) => {
        version += 1;
        return hit(makeTrack({ sourceId, previewUrl: `https://preview.example/${version}.mp3` }));
      },
    });
    const catalog = createCatalog({ providers: [deezer], ...baseOptions });
    const first = await catalog.getTrack("deezer:1");
    const refreshed = await catalog.refreshPreview("deezer:1");
    const cachedAfter = await catalog.getTrack("deezer:1");
    expect(first?.previewUrl).toContain("/1.mp3");
    expect(refreshed?.previewUrl).toContain("/2.mp3");
    expect(cachedAfter?.previewUrl).toContain("/2.mp3");
  });
});
