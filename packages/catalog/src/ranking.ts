import type { Track, TrackSource } from "@joymusic/shared";
import { normalizeForMatch, phoneticKey } from "./transliteration";

export interface Candidate {
  track: Track;
  popularity: number | null;
  providerId: TrackSource;
  position: number;
}

export interface RankedCandidate extends Candidate {
  matchScore: number;
  score: number;
}

function wordPattern(words: string[]): RegExp {
  const alternatives = words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, "iu");
}

interface JunkFamily {
  name: string;
  inTrack: RegExp;
  inQuery: RegExp;
}

const junkFamilies: JunkFamily[] = [
  {
    name: "karaoke",
    inTrack: wordPattern(["karaoke", "караоке"]),
    inQuery: wordPattern(["karaoke", "караоке"]),
  },
  {
    name: "tribute",
    inTrack: wordPattern(["tribute", "tribute to", "трибьют"]),
    inQuery: wordPattern(["tribute", "трибьют"]),
  },
  {
    name: "instrumental",
    inTrack: wordPattern(["instrumental", "backing track", "minus one", "инструментал", "минус"]),
    inQuery: wordPattern(["instrumental", "backing", "minus", "инструментал", "минус"]),
  },
  {
    name: "cover",
    inTrack:
      /[([]\s*cover\s*[)\]]|(?<![\p{L}\p{N}])(?:cover version|covered by|кавер)(?![\p{L}\p{N}])/iu,
    inQuery: wordPattern(["cover", "covered", "кавер"]),
  },
  {
    name: "stylized",
    inTrack: wordPattern([
      "made famous by",
      "originally performed",
      "in the style of",
      "as made famous",
    ]),
    inQuery: wordPattern(["made famous", "originally performed", "style of"]),
  },
  {
    name: "novelty",
    inTrack: wordPattern([
      "lullaby",
      "lullabies",
      "nursery",
      "8 bit",
      "8-bit",
      "music box",
      "piano version",
      "string quartet",
      "rockabye baby",
    ]),
    inQuery: wordPattern(["lullaby", "nursery", "8 bit", "8-bit", "music box", "piano", "quartet"]),
  },
];

export function junkFamiliesIn(track: Track): string[] {
  const text = `${track.title} ${track.artist} ${track.album ?? ""}`;
  return junkFamilies.filter((family) => family.inTrack.test(text)).map((family) => family.name);
}

export function junkPenalty(track: Track, query: string): number {
  for (const family of junkFamilies) {
    const text = `${track.title} ${track.artist} ${track.album ?? ""}`;
    if (family.inTrack.test(text) && !family.inQuery.test(query)) return 0.8;
  }
  return 0;
}

function tokenize(text: string): string[] {
  return text.split(" ").filter((token) => token.length > 0);
}

function tokenCoverage(queryTokens: string[], haystackTokens: string[]): number {
  if (queryTokens.length === 0) return 0;
  let total = 0;
  for (const token of queryTokens) {
    if (haystackTokens.includes(token)) total += 1;
    else if (token.length >= 2 && haystackTokens.some((candidate) => candidate.startsWith(token)))
      total += 0.7;
  }
  return total / queryTokens.length;
}

export function matchScore(queryKey: string, titleKey: string, artistKey: string): number {
  if (queryKey.length === 0) return 0;
  const combinedForward = `${artistKey} ${titleKey}`;
  const combinedBackward = `${titleKey} ${artistKey}`;
  if (queryKey === titleKey || queryKey === combinedForward || queryKey === combinedBackward)
    return 1.2;
  if (queryKey === artistKey) return 1.05;
  const queryTokens = tokenize(queryKey);
  const titleTokens = tokenize(titleKey);
  const artistTokens = tokenize(artistKey);
  const coverage = tokenCoverage(queryTokens, [...artistTokens, ...titleTokens]);
  let score = coverage * 0.7;
  if (coverage >= 0.999) score += 0.1;
  const artistCoverage = tokenCoverage(queryTokens, artistTokens);
  if (artistCoverage >= 0.999) score += 0.1;
  const titleCoverage = tokenCoverage(queryTokens, titleTokens);
  if (titleCoverage >= 0.999) score += 0.1;
  if (titleKey.startsWith(queryKey) || artistKey.startsWith(queryKey)) score += 0.15;
  return score;
}

export interface RankOptions {
  queries: string[];
  original: string;
}

export function rankCandidates(candidates: Candidate[], options: RankOptions): RankedCandidate[] {
  const phoneticQueries = [
    ...new Set(options.queries.map(phoneticKey).filter((key) => key.length > 0)),
  ];
  const rawQueries = [
    ...new Set(options.queries.map(normalizeForMatch).filter((key) => key.length > 0)),
  ];
  const total = Math.max(1, candidates.length);
  const ranked = candidates.map((candidate) => {
    const titlePhonetic = phoneticKey(candidate.track.title);
    const artistPhonetic = phoneticKey(candidate.track.artist);
    const titleRaw = normalizeForMatch(candidate.track.title);
    const artistRaw = normalizeForMatch(candidate.track.artist);
    let best = 0;
    for (const queryKey of phoneticQueries) {
      best = Math.max(best, matchScore(queryKey, titlePhonetic, artistPhonetic));
    }
    for (const queryKey of rawQueries) {
      best = Math.max(best, matchScore(queryKey, titleRaw, artistRaw));
    }
    const popularity = candidate.popularity ?? 0;
    const positionBonus = (1 - Math.min(candidate.position, total) / total) * 0.04;
    const artwork = candidate.track.artworkUrl ? 0.06 : 0;
    const preview = candidate.track.previewUrl ? 0.04 : 0;
    const penalty = junkPenalty(candidate.track, options.original);
    const score = best + popularity * 0.25 + artwork + preview + positionBonus - penalty;
    return { ...candidate, matchScore: best, score };
  });
  return ranked.sort((left, right) => right.score - left.score);
}

const noiseInTitle = [
  /\s*[([]\s*(?:feat\.?|ft\.?|featuring|with)\s[^)\]]*[)\]]/gi,
  /\s*[([]\s*(?:radio edit|album version|single version|original version|remaster(?:ed)?(?:\s+\d{4})?|\d{4}\s+remaster(?:ed)?|mono|stereo)\s*[)\]]/gi,
  /\s+-\s+(?:remaster(?:ed)?(?:\s+\d{4})?|\d{4}\s+remaster(?:ed)?|radio edit|single version|album version)\s*$/gi,
];

export function baseTitle(title: string): string {
  let cleaned = title;
  for (const pattern of noiseInTitle) cleaned = cleaned.replace(pattern, "");
  return cleaned.trim();
}

export function primaryArtist(artist: string): string {
  const first = artist.split(
    /\s*[,&;/]\s*|\s+(?:feat\.?|ft\.?|featuring|with|vs\.?|and|x|и)\s+/iu,
  )[0];
  return first && first.trim().length > 0 ? first : artist;
}

export function dedupeKey(track: Track): string {
  return `${phoneticKey(primaryArtist(track.artist))}|${phoneticKey(baseTitle(track.title))}`;
}

function completeness(candidate: Candidate): number {
  return (candidate.track.artworkUrl ? 2 : 0) + (candidate.track.previewUrl ? 1 : 0);
}

function pickPreferred(left: RankedCandidate, right: RankedCandidate): RankedCandidate {
  const leftComplete = completeness(left);
  const rightComplete = completeness(right);
  if (leftComplete !== rightComplete) return leftComplete > rightComplete ? left : right;
  const leftPopularity = left.popularity ?? 0;
  const rightPopularity = right.popularity ?? 0;
  if (leftPopularity !== rightPopularity) return leftPopularity > rightPopularity ? left : right;
  return left.score >= right.score ? left : right;
}

function mergeInto(preferred: RankedCandidate, other: RankedCandidate): RankedCandidate {
  const track: Track = {
    ...preferred.track,
    album: preferred.track.album ?? other.track.album,
    artworkUrl: preferred.track.artworkUrl ?? other.track.artworkUrl,
    previewUrl: preferred.track.previewUrl ?? other.track.previewUrl,
    durationSec: preferred.track.durationSec ?? other.track.durationSec,
    explicit: preferred.track.explicit || other.track.explicit,
  };
  return {
    ...preferred,
    track,
    popularity: preferred.popularity ?? other.popularity,
    matchScore: Math.max(preferred.matchScore, other.matchScore),
    score: Math.max(preferred.score, other.score),
  };
}

export function mergeAndDedupe(ranked: RankedCandidate[]): RankedCandidate[] {
  const groups = new Map<string, RankedCandidate>();
  const order: string[] = [];
  for (const candidate of ranked) {
    const key = dedupeKey(candidate.track);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, candidate);
      order.push(key);
      continue;
    }
    const preferred = pickPreferred(existing, candidate);
    const other = preferred === existing ? candidate : existing;
    groups.set(key, mergeInto(preferred, other));
  }
  return order
    .map((key) => groups.get(key) as RankedCandidate)
    .sort((left, right) => right.score - left.score);
}
