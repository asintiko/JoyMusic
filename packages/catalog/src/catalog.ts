import type { Track } from "@joymusic/shared";
import { createMemoryCache } from "./cache";
import { createDeezerProvider, deezerPreviewExpiry } from "./providers/deezer";
import { createItunesProvider } from "./providers/itunes";
import type { Candidate, RankedCandidate } from "./ranking";
import { dedupeKey, junkPenalty, mergeAndDedupe, primaryArtist, rankCandidates } from "./ranking";
import {
  AbortedError,
  CircuitBreaker,
  CircuitOpenError,
  TimeoutError,
  createLimiter,
  createSingleFlight,
  withRetry,
  withTimeout,
} from "./resilience";
import type { SeededSectionId, SeedEntry } from "./seeds";
import { sectionSeeds } from "./seeds";
import { normalizeForMatch, phoneticKey, searchVariants } from "./transliteration";
import type {
  Catalog,
  CatalogCache,
  CatalogHit,
  CatalogOptions,
  CatalogProvider,
  ProviderStatus,
  SuggestionSectionId,
} from "./types";
import { CatalogUnavailableError, ProviderError } from "./types";

const defaultSearchLimit = 20;
const defaultSuggestionLimit = 20;
const maxQueryLength = 120;
const minQueryLength = 2;
const previewSkewMs = 60_000;
const strongMatchScore = 0.8;
const seedAcceptScore = 0.9;
const seedBatchSize = 8;
const chartFetchSize = 50;
const providerFetchSize = 30;
const playlistTopUpBelow = 10;
const maxTracksPerArtistInSection = 2;
const searchCachePrefix = "search:v1:";
const trackCachePrefix = "track:v1:";
const sectionCachePrefix = "section:v1:";

interface ProviderRuntime {
  provider: CatalogProvider;
  breaker: CircuitBreaker;
  limiter: ReturnType<typeof createLimiter>;
  lastError: string | null;
}

interface SectionState {
  tracks: Track[];
  cursor: number;
  done: boolean;
}

interface FetchRound {
  candidates: Candidate[];
  attempts: number;
  failures: number;
  failedProviders: Set<string>;
}

function sleepFor(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function countsAgainstBreaker(error: unknown): boolean {
  if (error instanceof AbortedError) return false;
  if (error instanceof ProviderError) {
    return error.retryable || (error.status !== null && error.status >= 500);
  }
  return true;
}

export function normalizeQuery(query: string): string {
  return query.normalize("NFKC").replace(/\s+/gu, " ").trim().slice(0, maxQueryLength).trim();
}

function parseTrackId(id: string): { source: string; sourceId: string } | null {
  const separator = id.indexOf(":");
  if (separator <= 0 || separator === id.length - 1) return null;
  return { source: id.slice(0, separator), sourceId: id.slice(separator + 1) };
}

async function mapWithLimit<T, R>(
  items: readonly T[],
  concurrency: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await task(items[index] as T, index);
    }
  });
  await Promise.all(workers);
  return results;
}

export function createCatalog(options: CatalogOptions = {}): Catalog {
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? sleepFor;
  const cache: CatalogCache = options.cache ?? createMemoryCache({ now });
  const providers = options.providers ?? [
    createDeezerProvider({ fetch: options.fetch }),
    createItunesProvider({ fetch: options.fetch }),
  ];
  const providerTimeoutMs = options.providerTimeoutMs ?? 3000;
  const retryOptions = {
    attempts: options.retryAttempts ?? 2,
    baseDelayMs: options.retryBaseDelayMs ?? 150,
    maxDelayMs: options.retryMaxDelayMs ?? 800,
    random,
    sleep,
  };
  const maxVariants = options.maxVariants ?? 3;
  const variantStrategy = options.variantStrategy ?? "adaptive";
  const adaptiveStrongMatches = options.adaptiveStrongMatches ?? 3;
  const searchTtlMs = options.searchTtlMs ?? 8 * 60_000;
  const suggestionsTtlMs = options.suggestionsTtlMs ?? 6 * 60 * 60_000;
  const chartTtlMs = Math.min(suggestionsTtlMs, 30 * 60_000);
  const trackTtlMs = options.trackTtlMs ?? 8 * 60_000;
  const maxCandidates = options.maxCandidates ?? 50;
  const seedTracksPerQuery = options.seedTracksPerQuery ?? maxTracksPerArtistInSection;
  const seedConcurrency = options.seedConcurrency ?? 4;
  const providerConcurrency = options.providerConcurrency ?? 8;

  const runtimes: ProviderRuntime[] = providers.map((provider) => ({
    provider,
    breaker: new CircuitBreaker({
      failureThreshold: options.breakerFailureThreshold ?? 5,
      cooldownMs: options.breakerCooldownMs ?? 30_000,
      now,
    }),
    limiter: createLimiter(providerConcurrency),
    lastError: null,
  }));

  const searchFlight = createSingleFlight<Track[]>();
  const trackFlight = createSingleFlight<Track | null>();
  const sectionFlight = createSingleFlight<SectionState>();

  const safeCacheGet = async <T>(key: string): Promise<T | undefined> => {
    try {
      return await cache.get<T>(key);
    } catch {
      return undefined;
    }
  };

  const safeCacheSet = async <T>(key: string, value: T, ttlMs: number): Promise<void> => {
    try {
      await cache.set(key, value, ttlMs);
    } catch {
      return;
    }
  };

  const callProvider = async <T>(
    runtime: ProviderRuntime,
    task: (signal: AbortSignal) => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> => {
    if (!runtime.breaker.tryAcquire()) throw new CircuitOpenError();
    try {
      const result = await runtime.limiter.run(() =>
        withTimeout(
          (attemptSignal) => withRetry(() => task(attemptSignal), retryOptions, attemptSignal),
          providerTimeoutMs,
          signal,
        ),
      );
      runtime.breaker.recordSuccess();
      runtime.lastError = null;
      return result;
    } catch (error) {
      if (error instanceof AbortedError) {
        runtime.breaker.releaseWithoutOutcome();
        throw error;
      }
      if (countsAgainstBreaker(error)) runtime.breaker.recordFailure();
      else runtime.breaker.releaseWithoutOutcome();
      runtime.lastError =
        error instanceof TimeoutError
          ? "timeout"
          : error instanceof Error
            ? error.message
            : "unknown error";
      throw error;
    }
  };

  const isPreviewStale = (track: Track): boolean => {
    const expiry = deezerPreviewExpiry(track.previewUrl);
    return expiry !== null && expiry - previewSkewMs <= now();
  };

  const runtimeFor = (source: string): ProviderRuntime | undefined =>
    runtimes.find((runtime) => runtime.provider.id === source);

  const lookupTrack = async (id: string, signal?: AbortSignal): Promise<Track | null> => {
    const parsed = parseTrackId(id);
    if (!parsed) return null;
    const runtime = runtimeFor(parsed.source);
    const getter = runtime?.provider.getTrack?.bind(runtime.provider);
    if (!runtime || !getter) return null;
    const hit = await callProvider(
      runtime,
      (attemptSignal) => getter(parsed.sourceId, attemptSignal),
      signal,
    );
    return hit ? hit.track : null;
  };

  const refreshStalePreviews = async (
    all: Track[],
    visibleCount: number,
  ): Promise<{ visible: Track[]; all: Track[]; changed: boolean }> => {
    const stale = all.slice(0, visibleCount).filter(isPreviewStale);
    if (stale.length === 0) return { visible: all.slice(0, visibleCount), all, changed: false };
    const refreshed = new Map<string, Track | null>();
    await mapWithLimit(stale, 6, async (track) => {
      try {
        refreshed.set(track.id, await lookupTrack(track.id));
      } catch {
        refreshed.set(track.id, null);
      }
    });
    const updated = all.map((track) => {
      if (!refreshed.has(track.id)) return track;
      const fresh = refreshed.get(track.id);
      return { ...track, previewUrl: fresh ? fresh.previewUrl : null };
    });
    return { visible: updated.slice(0, visibleCount), all: updated, changed: true };
  };

  const abortable = <T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (!signal) return promise;
    if (signal.aborted) return Promise.reject(new AbortedError());
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(new AbortedError());
      signal.addEventListener("abort", onAbort, { once: true });
      promise.then(
        (value) => {
          signal.removeEventListener("abort", onAbort);
          resolve(value);
        },
        (error: unknown) => {
          signal.removeEventListener("abort", onAbort);
          reject(error);
        },
      );
    });
  };

  const fetchRound = async (
    queries: string[],
    limit: number,
    signal?: AbortSignal,
    skip: ReadonlySet<string> = new Set(),
  ): Promise<FetchRound> => {
    const jobs = runtimes
      .filter((runtime) => !skip.has(runtime.provider.id))
      .flatMap((runtime) => queries.map((query) => ({ runtime, query })));
    const settled = await Promise.allSettled(
      jobs.map(({ runtime, query }) =>
        callProvider(
          runtime,
          (attemptSignal) => runtime.provider.search(query, limit, attemptSignal),
          signal,
        ),
      ),
    );
    const candidates: Candidate[] = [];
    const failedProviders = new Set<string>();
    let failures = 0;
    settled.forEach((outcome, index) => {
      const job = jobs[index];
      if (!job) return;
      if (outcome.status === "rejected") {
        if (outcome.reason instanceof AbortedError) throw outcome.reason;
        failures += 1;
        failedProviders.add(job.runtime.provider.id);
        return;
      }
      outcome.value.forEach((hit: CatalogHit, position: number) => {
        candidates.push({
          track: hit.track,
          popularity: hit.popularity,
          providerId: job.runtime.provider.id,
          position,
        });
      });
    });
    return { candidates, attempts: jobs.length, failures, failedProviders };
  };

  const rankAndMerge = (
    candidates: Candidate[],
    variants: string[],
    original: string,
  ): RankedCandidate[] =>
    mergeAndDedupe(rankCandidates(candidates, { queries: variants, original }));

  const searchRanked = async (
    query: string,
    variantLimit: number,
    signal?: AbortSignal,
  ): Promise<RankedCandidate[]> => {
    const variants = searchVariants(query, { max: variantLimit });
    const original = variants[0] ?? query;
    const fetchSize = providerFetchSize;
    if (runtimes.length === 0) return [];

    if (variantStrategy === "parallel" || variants.length <= 1) {
      const round = await fetchRound(variants, fetchSize, signal);
      if (round.attempts > 0 && round.failures === round.attempts)
        throw new CatalogUnavailableError();
      return rankAndMerge(round.candidates, variants, original);
    }

    const first = await fetchRound([original], fetchSize, signal);
    if (first.attempts > 0 && first.failures === first.attempts)
      throw new CatalogUnavailableError();
    const firstRanked = rankAndMerge(first.candidates, variants, original);
    const strong = firstRanked.filter((entry) => entry.matchScore >= strongMatchScore).length;
    if (strong >= adaptiveStrongMatches) return firstRanked;

    const second = await fetchRound(variants.slice(1), fetchSize, undefined, first.failedProviders);
    return rankAndMerge([...first.candidates, ...second.candidates], variants, original);
  };

  const search: Catalog["search"] = async (query, limit = defaultSearchLimit, signal) => {
    const normalized = normalizeQuery(query);
    if (normalized.length < minQueryLength) return [];
    const wanted = Math.max(1, Math.min(limit, maxCandidates));
    const key = `${searchCachePrefix}${normalizeForMatch(normalized) || normalized.toLowerCase()}`;

    const cached = await safeCacheGet<Track[]>(key);
    if (cached) {
      const refreshed = await refreshStalePreviews(cached, wanted);
      if (refreshed.changed) await safeCacheSet(key, refreshed.all, searchTtlMs);
      return refreshed.visible;
    }

    const results = await abortable(
      searchFlight(key, async () => {
        const ranked = (await searchRanked(normalized, maxVariants))
          .slice(0, maxCandidates)
          .map((entry) => entry.track);
        await safeCacheSet(key, ranked, searchTtlMs);
        return ranked;
      }),
      signal,
    );
    return results.slice(0, wanted);
  };

  const getTrack: Catalog["getTrack"] = async (id) => {
    const parsed = parseTrackId(id);
    if (!parsed) return null;
    const key = `${trackCachePrefix}${id}`;
    const cached = await safeCacheGet<Track>(key);
    if (cached) {
      const refreshed = await refreshStalePreviews([cached], 1);
      const [track] = refreshed.all;
      if (track && refreshed.changed) await safeCacheSet(key, track, trackTtlMs);
      return track ?? null;
    }
    return trackFlight(key, async () => {
      const track = await lookupTrack(id);
      if (track) await safeCacheSet(key, track, trackTtlMs);
      return track;
    });
  };

  const refreshPreview: Catalog["refreshPreview"] = async (id) => {
    const key = `${trackCachePrefix}${id}`;
    const track = await lookupTrack(id);
    if (track) await safeCacheSet(key, track, trackTtlMs);
    return track;
  };

  const chartTracks = async (limit: number): Promise<Track[]> => {
    const key = `${sectionCachePrefix}chart`;
    const cached = await safeCacheGet<SectionState>(key);
    if (cached && cached.tracks.length > 0) {
      const refreshed = await refreshStalePreviews(cached.tracks, limit);
      if (refreshed.changed) {
        await safeCacheSet(key, { ...cached, tracks: refreshed.all }, chartTtlMs);
      }
      return refreshed.visible;
    }
    const state = await sectionFlight(key, async () => {
      let lastError: unknown = null;
      for (const runtime of runtimes) {
        const chart = runtime.provider.chart?.bind(runtime.provider);
        if (!chart) continue;
        try {
          const hits = await callProvider(runtime, (signal) => chart(chartFetchSize, signal));
          const tracks = hits.map((hit) => hit.track);
          const value: SectionState = { tracks, cursor: 0, done: true };
          if (tracks.length > 0) await safeCacheSet(key, value, chartTtlMs);
          return value;
        } catch (error) {
          lastError = error;
        }
      }
      if (lastError) throw new CatalogUnavailableError("No chart provider is available");
      return { tracks: [], cursor: 0, done: true };
    });
    return state.tracks.slice(0, limit);
  };

  const resolveEntry = async (entry: SeedEntry): Promise<{ tracks: Track[]; failed: boolean }> => {
    const queries = [entry.query, ...(entry.alternatives ?? [])];
    const wanted = entry.kind === "track" ? 1 : seedTracksPerQuery;
    let failed = false;
    for (const query of queries) {
      try {
        const ranked = await searchRanked(normalizeQuery(query), 1);
        const accepted = ranked
          .filter(
            (candidate) =>
              candidate.matchScore >= seedAcceptScore && junkPenalty(candidate.track, query) === 0,
          )
          .slice(0, wanted)
          .map((candidate) => candidate.track);
        if (accepted.length > 0) return { tracks: accepted, failed: false };
      } catch {
        failed = true;
      }
    }
    return { tracks: [], failed };
  };

  const pickForSection = (existing: Track[], incoming: Track[]): Track[] => {
    const seen = new Set(existing.map(dedupeKey));
    const perArtist = new Map<string, number>();
    for (const track of existing) {
      const artist = phoneticKey(primaryArtist(track.artist));
      perArtist.set(artist, (perArtist.get(artist) ?? 0) + 1);
    }
    const picked: Track[] = [];
    for (const track of incoming) {
      const key = dedupeKey(track);
      const artist = phoneticKey(primaryArtist(track.artist));
      if (seen.has(key)) continue;
      if ((perArtist.get(artist) ?? 0) >= maxTracksPerArtistInSection) continue;
      seen.add(key);
      perArtist.set(artist, (perArtist.get(artist) ?? 0) + 1);
      picked.push(track);
    }
    return picked;
  };

  const topUpFromPlaylists = async (
    section: SeededSectionId,
    existing: Track[],
  ): Promise<Track[]> => {
    const queries = sectionSeeds[section].playlistQueries;
    const collected: Track[] = [];
    for (const runtime of runtimes) {
      const playlistTracks = runtime.provider.playlistTracks?.bind(runtime.provider);
      if (!playlistTracks) continue;
      for (const query of queries) {
        try {
          const hits = await callProvider(runtime, (signal) => playlistTracks(query, 40, signal));
          const ranked = rankCandidates(
            hits.map((hit, position) => ({
              track: hit.track,
              popularity: hit.popularity,
              providerId: runtime.provider.id,
              position,
            })),
            { queries: [query], original: query },
          ).filter((candidate) => candidate.score > 0);
          collected.push(...ranked.map((candidate) => candidate.track));
        } catch {
          continue;
        }
      }
    }
    return pickForSection(existing, collected);
  };

  const advanceSection = async (
    section: SeededSectionId,
    state: SectionState,
  ): Promise<SectionState> => {
    const seed = sectionSeeds[section];
    const batch = seed.entries.slice(state.cursor, state.cursor + seedBatchSize);
    const resolved = await mapWithLimit(batch, seedConcurrency, resolveEntry);
    const incoming = resolved.flatMap((entry) => entry.tracks);
    const cursor = state.cursor + batch.length;
    const done = cursor >= seed.entries.length;
    let tracks = [...state.tracks, ...pickForSection(state.tracks, incoming)];
    if (done && tracks.length < playlistTopUpBelow) {
      tracks = [...tracks, ...(await topUpFromPlaylists(section, tracks))];
    }
    const allFailed =
      resolved.length > 0 && resolved.every((entry) => entry.failed && entry.tracks.length === 0);
    if (allFailed && tracks.length === 0) throw new CatalogUnavailableError();
    return { tracks, cursor, done };
  };

  const seededSuggestions = async (section: SeededSectionId, limit: number): Promise<Track[]> => {
    const key = `${sectionCachePrefix}${section}`;
    const cached = await safeCacheGet<SectionState>(key);
    let state: SectionState = cached ?? { tracks: [], cursor: 0, done: false };
    if (!state.done && state.tracks.length < limit) {
      state = await sectionFlight(`${key}:${limit}`, async () => {
        let current: SectionState = (await safeCacheGet<SectionState>(key)) ?? state;
        while (!current.done && current.tracks.length < limit) {
          current = await advanceSection(section, current);
          await safeCacheSet(key, current, suggestionsTtlMs);
        }
        return current;
      });
    }
    const refreshed = await refreshStalePreviews(state.tracks, limit);
    if (refreshed.changed)
      await safeCacheSet(key, { ...state, tracks: refreshed.all }, suggestionsTtlMs);
    return refreshed.visible;
  };

  const suggestions: Catalog["suggestions"] = async (
    section: SuggestionSectionId,
    limit = defaultSuggestionLimit,
  ) => {
    const wanted = Math.max(1, limit);
    if (section === "dj_picks") return [];
    if (section === "trending_here") return chartTracks(wanted);
    return seededSuggestions(section, wanted);
  };

  const providerStatus = (): ProviderStatus[] =>
    runtimes.map((runtime) => ({
      id: runtime.provider.id,
      breaker: runtime.breaker.state(),
      consecutiveFailures: runtime.breaker.consecutiveFailures,
      lastError: runtime.lastError,
    }));

  return { search, suggestions, getTrack, refreshPreview, providerStatus };
}
