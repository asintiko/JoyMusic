import type { ApiClient, SuggestionSection } from "@joymusic/shared";

const ttlMs = 120_000;
const cache = new Map<string, { at: number; sections: SuggestionSection[] }>();
const inflight = new Map<string, Promise<SuggestionSection[]>>();

export function cachedSuggestions(slug: string, now = Date.now()): SuggestionSection[] | null {
  const entry = cache.get(slug);
  return entry && now - entry.at < ttlMs ? entry.sections : null;
}

export function loadSuggestions(api: ApiClient, slug: string): Promise<SuggestionSection[]> {
  const cached = cachedSuggestions(slug);
  if (cached) return Promise.resolve(cached);
  const pending = inflight.get(slug);
  if (pending) return pending;
  const request = api
    .call("suggestions", { params: { slug } })
    .then((result) => {
      cache.set(slug, { at: Date.now(), sections: result.sections });
      return result.sections;
    })
    .finally(() => inflight.delete(slug));
  inflight.set(slug, request);
  return request;
}

export function clearSuggestionsCache(): void {
  cache.clear();
  inflight.clear();
}
