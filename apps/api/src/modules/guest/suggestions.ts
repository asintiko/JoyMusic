import { desc, eq, inArray, sql } from "drizzle-orm";
import { suggestionSectionIds, type SuggestionSection, type Track } from "@joymusic/shared";
import type { Deps } from "../../deps";
import { djSessions, tracks } from "../../db/schema";
import { toTrack } from "../requests/mapper";
import type { VenueRecord } from "../venues/service";

const sectionSize = 12;
const trendingWindowDays = 14;
const dayMs = 24 * 60 * 60 * 1000;
const cacheTtlSeconds = 120;

type SectionId = SuggestionSection["id"];

async function tracksByIds(deps: Deps, ids: readonly string[]): Promise<Track[]> {
  if (ids.length === 0) return [];
  const rows = await deps.db
    .select()
    .from(tracks)
    .where(inArray(tracks.id, [...ids]));
  const byId = new Map(rows.map((row) => [row.id, toTrack(row)]));
  return ids.flatMap((id) => {
    const found = byId.get(id);
    return found ? [found] : [];
  });
}

async function trendingHere(deps: Deps, venueId: string): Promise<Track[]> {
  const since = new Date(Date.now() - trendingWindowDays * dayMs);
  const rows = await deps.db.execute<{ id: string }>(sql`
    select r.track_id as id from requests r
    where r.venue_id = ${venueId}
      and r.created_at >= ${since.toISOString()}::timestamptz
      and r.track_id is not null
      and r.status in ('pending', 'accepted', 'playing', 'played')
    group by r.track_id
    order by count(*) desc, max(r.created_at) desc
    limit ${sectionSize}
  `);
  return tracksByIds(
    deps,
    rows.map((row) => row.id),
  );
}

async function djPicks(deps: Deps, venueId: string): Promise<Track[]> {
  const [latest] = await deps.db
    .select({ djUserId: djSessions.djUserId })
    .from(djSessions)
    .where(eq(djSessions.venueId, venueId))
    .orderBy(sql`${djSessions.endedAt} is not null`, desc(djSessions.startedAt))
    .limit(1);
  if (!latest) return [];
  const rows = await deps.db.execute<{ id: string }>(sql`
    select t.track_id as id from (
      select r.track_id, count(*) as n
      from requests r join dj_sessions s on s.id = r.session_id
      where s.dj_user_id = ${latest.djUserId}
        and r.status in ('accepted', 'playing', 'played')
        and r.track_id is not null
      group by r.track_id
      union all
      select p.track_id, count(*) as n
      from play_log p join dj_sessions s on s.id = p.session_id
      where s.dj_user_id = ${latest.djUserId} and p.track_id is not null
      group by p.track_id
    ) t
    group by t.track_id
    order by sum(t.n) desc, t.track_id asc
    limit ${sectionSize}
  `);
  return tracksByIds(
    deps,
    rows.map((row) => row.id),
  );
}

async function fromCatalog(deps: Deps, section: SectionId): Promise<Track[]> {
  try {
    return await deps.catalog.suggestions(section, sectionSize);
  } catch {
    return [];
  }
}

async function recentTracks(deps: Deps): Promise<Track[]> {
  const rows = await deps.db
    .select()
    .from(tracks)
    .orderBy(desc(tracks.firstSeenAt), desc(tracks.id))
    .limit(sectionSize);
  return rows.map(toTrack);
}

const fallbackChains: Record<SectionId, readonly SectionId[]> = {
  trending_here: ["trending_here", "uz_hits", "club"],
  dj_picks: ["club", "trending_here", "uz_hits"],
  uz_hits: ["trending_here", "club"],
  ru_pop: ["trending_here", "club"],
  club: ["trending_here", "uz_hits"],
  slow: ["trending_here", "uz_hits"],
  birthday: ["club", "trending_here"],
};

function distinct(list: readonly Track[]): Track[] {
  const seen = new Set<string>();
  return list.filter((track) => {
    if (seen.has(track.id)) return false;
    seen.add(track.id);
    return true;
  });
}

async function ownTracks(deps: Deps, venue: VenueRecord, section: SectionId): Promise<Track[]> {
  if (section === "trending_here") return trendingHere(deps, venue.id);
  if (section === "dj_picks") return djPicks(deps, venue.id);
  return fromCatalog(deps, section);
}

async function buildSection(deps: Deps, venue: VenueRecord, section: SectionId) {
  let collected = distinct(await ownTracks(deps, venue, section));
  if (collected.length < sectionSize / 2) {
    for (const fallback of fallbackChains[section]) {
      if (collected.length >= sectionSize) break;
      collected = distinct([...collected, ...(await fromCatalog(deps, fallback))]);
    }
  }
  if (collected.length === 0) collected = await recentTracks(deps);
  return { id: section, tracks: collected.slice(0, sectionSize) } satisfies SuggestionSection;
}

export async function loadSuggestions(
  deps: Deps,
  venue: VenueRecord,
): Promise<{ sections: SuggestionSection[] }> {
  const cacheKey = `suggestions:${venue.id}`;
  const cached = await deps.cache.get(cacheKey).catch(() => null);
  if (cached) return JSON.parse(cached) as { sections: SuggestionSection[] };
  const sections = await Promise.all(
    suggestionSectionIds.map((section) => buildSection(deps, venue, section)),
  );
  const result = { sections };
  if (sections.some((section) => section.tracks.length > 0)) {
    await deps.cache.set(cacheKey, JSON.stringify(result), cacheTtlSeconds).catch(() => undefined);
  }
  return result;
}
