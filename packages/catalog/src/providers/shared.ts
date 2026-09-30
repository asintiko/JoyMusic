import { trackSchema } from "@joymusic/shared";
import type { Track, TrackSource } from "@joymusic/shared";
import type { CatalogHit, FetchLike } from "../types";
import { ProviderError } from "../types";

export function clip(text: string, max: number): string {
  const trimmed = text.normalize("NFC").trim();
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trimEnd();
}

export function buildTrack(
  source: TrackSource,
  sourceId: string,
  fields: Omit<Track, "id" | "source" | "sourceId">,
): Track | null {
  const candidate = {
    id: `${source}:${sourceId}`,
    source,
    sourceId,
    ...fields,
    title: clip(fields.title, 200),
    artist: clip(fields.artist, 200),
    album: fields.album === null ? null : clip(fields.album, 200) || null,
  };
  const parsed = trackSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

export function compactHits(hits: Array<CatalogHit | null>): CatalogHit[] {
  return hits.filter((hit): hit is CatalogHit => hit !== null);
}

export function resolveFetch(custom: FetchLike | undefined): FetchLike {
  if (custom) return custom;
  return (input, init) => globalThis.fetch(input, init);
}

export async function readJson(
  fetcher: FetchLike,
  url: string,
  signal: AbortSignal | undefined,
  label: string,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetcher(url, { signal, headers: { accept: "application/json" } });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ProviderError(`${label} network error`, { retryable: true, cause: error });
  }
  if (!response.ok) {
    const retryable = response.status === 429 || response.status >= 500;
    throw new ProviderError(`${label} responded with ${response.status}`, {
      retryable,
      status: response.status,
    });
  }
  try {
    return await response.json();
  } catch (error) {
    throw new ProviderError(`${label} returned invalid JSON`, { retryable: true, cause: error });
  }
}
