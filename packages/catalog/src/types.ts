import type { SuggestionSection, Track, TrackSource } from "@joymusic/shared";

export type SuggestionSectionId = SuggestionSection["id"];

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface CatalogHit {
  track: Track;
  popularity: number | null;
}

export interface CatalogProvider {
  readonly id: TrackSource;
  search(query: string, limit: number, signal?: AbortSignal): Promise<CatalogHit[]>;
  getTrack?(sourceId: string, signal?: AbortSignal): Promise<CatalogHit | null>;
  chart?(limit: number, signal?: AbortSignal): Promise<CatalogHit[]>;
  playlistTracks?(query: string, limit: number, signal?: AbortSignal): Promise<CatalogHit[]>;
}

export interface CatalogCache {
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  delete(key: string): Promise<void>;
}

export type BreakerState = "closed" | "open" | "half-open";

export interface ProviderStatus {
  id: TrackSource;
  breaker: BreakerState;
  consecutiveFailures: number;
  lastError: string | null;
}

export interface CatalogOptions {
  providers?: CatalogProvider[];
  cache?: CatalogCache;
  fetch?: FetchLike;
  now?: () => number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
  providerTimeoutMs?: number;
  retryAttempts?: number;
  retryBaseDelayMs?: number;
  retryMaxDelayMs?: number;
  breakerFailureThreshold?: number;
  breakerCooldownMs?: number;
  providerConcurrency?: number;
  maxVariants?: number;
  variantStrategy?: "adaptive" | "parallel";
  adaptiveStrongMatches?: number;
  searchTtlMs?: number;
  suggestionsTtlMs?: number;
  trackTtlMs?: number;
  maxCandidates?: number;
  seedTracksPerQuery?: number;
  seedConcurrency?: number;
}

export interface Catalog {
  search(query: string, limit?: number, signal?: AbortSignal): Promise<Track[]>;
  suggestions(section: SuggestionSectionId, limit?: number): Promise<Track[]>;
  getTrack(id: string): Promise<Track | null>;
  refreshPreview(id: string): Promise<Track | null>;
  providerStatus(): ProviderStatus[];
}

export class ProviderError extends Error {
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(
    message: string,
    options: { retryable: boolean; status?: number | null; cause?: unknown },
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ProviderError";
    this.retryable = options.retryable;
    this.status = options.status ?? null;
  }
}

export class CatalogUnavailableError extends Error {
  constructor(message = "All catalog providers failed") {
    super(message);
    this.name = "CatalogUnavailableError";
  }
}
