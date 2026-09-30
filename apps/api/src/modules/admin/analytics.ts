import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq, isNull } from "drizzle-orm";
import { sql, type SQL } from "drizzle-orm";
import { routes, type AnalyticsOverview } from "@joymusic/shared";
import type { Database } from "../../db/client";
import { venues } from "../../db/schema";
import { badRequest } from "../../errors";
import { registerAdminRoute } from "../../http/register-route";
import { calendarDatesBetween, formatCalendarDate } from "../../lib/time";
import { adminRoles, assertVenueAccess } from "../auth/guards";

const defaultWindowDays = 30;
const dayChartLength = 30;
const topTrackLimit = 10;
const fallbackTimeZone = "Asia/Tashkent";
const dayMs = 24 * 60 * 60 * 1000;

export interface AnalyticsScope {
  organizationId: string;
  venueId?: string | undefined;
  from: Date;
  to: Date;
}

function idList(ids: readonly string[]): SQL {
  return sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  );
}

function inWindow(column: SQL, from: Date, to: Date): SQL {
  return sql`${column} >= ${from.toISOString()}::timestamptz and ${column} <= ${to.toISOString()}::timestamptz`;
}

export async function loadAnalytics(
  db: Database,
  scope: AnalyticsScope,
): Promise<AnalyticsOverview> {
  const scopedVenues = await db
    .select({ id: venues.id, timezone: venues.timezone })
    .from(venues)
    .where(
      and(
        eq(venues.organizationId, scope.organizationId),
        isNull(venues.deletedAt),
        scope.venueId ? eq(venues.id, scope.venueId) : undefined,
      ),
    )
    .orderBy(asc(venues.createdAt), asc(venues.id));
  const displayZone = scopedVenues[0]?.timezone ?? fallbackTimeZone;
  const hours = Array.from({ length: 24 }, (_unused, hour) => hour);

  const dayEnd = formatCalendarDate(scope.to, displayZone);
  const chartStart = formatCalendarDate(
    new Date(scope.to.getTime() - (dayChartLength - 1) * dayMs),
    displayZone,
  );
  const requestedStart = formatCalendarDate(scope.from, displayZone);
  const dayStart = requestedStart > chartStart ? requestedStart : chartStart;
  const dayRange = calendarDatesBetween(dayStart, dayEnd);

  if (scopedVenues.length === 0) {
    return {
      totals: { sessions: 0, requests: 0, uniqueGuests: 0, played: 0, declineRate: 0, scans: 0 },
      topTracks: [],
      byHour: hours.map((hour) => ({ hour, requests: 0 })),
      byDay: dayRange.map((date) => ({ date, requests: 0, guests: 0 })),
      byTable: [],
    };
  }

  const venueIds = idList(scopedVenues.map((venue) => venue.id));
  const requestWindow = inWindow(sql`r.created_at`, scope.from, scope.to);

  const [totalsRow] = await db.execute<{
    sessions: number;
    requests: number;
    declined: number;
    played: number;
    unique_guests: number;
    scans: number;
  }>(sql`
    select
      (select count(*)::int from dj_sessions s
        where s.venue_id in (${venueIds}) and ${inWindow(sql`s.started_at`, scope.from, scope.to)}) as sessions,
      (select count(*)::int from requests r
        where r.venue_id in (${venueIds}) and ${requestWindow}) as requests,
      (select count(*)::int from requests r
        where r.venue_id in (${venueIds}) and r.status = 'declined' and ${requestWindow}) as declined,
      (select count(*)::int from play_log p
        where p.venue_id in (${venueIds}) and ${inWindow(sql`p.started_at`, scope.from, scope.to)}) as played,
      (select count(*)::int from (
        select r.device_id from requests r
          where r.venue_id in (${venueIds}) and ${requestWindow}
        union
        select g.id from guest_devices g
          where g.venue_id in (${venueIds}) and ${inWindow(sql`g.last_seen_at`, scope.from, scope.to)}
      ) devices) as unique_guests,
      (select coalesce(sum(q.scans), 0)::int from qr_codes q
        where q.venue_id in (${venueIds})) as scans
  `);

  const topRows = await db.execute<{
    title: string;
    artist: string;
    artwork_url: string | null;
    total: number;
  }>(sql`
    select
      (array_agg(r.title order by r.votes desc, r.created_at asc, r.id asc))[1] as title,
      (array_agg(r.artist order by r.votes desc, r.created_at asc, r.id asc))[1] as artist,
      (array_agg(r.artwork_url order by (r.artwork_url is null), r.votes desc, r.created_at asc))[1]
        as artwork_url,
      sum(r.votes)::int as total
    from requests r
    where r.venue_id in (${venueIds}) and ${requestWindow}
    group by coalesce(r.track_id, lower(r.artist) || '|' || lower(r.title))
    order by total desc, min(r.created_at) asc, coalesce(r.track_id, lower(r.artist) || '|' || lower(r.title)) asc
    limit ${topTrackLimit}
  `);

  const hourRows = await db.execute<{ hour: number; requests: number }>(sql`
    select extract(hour from (r.created_at at time zone v.timezone))::int as hour,
      count(*)::int as requests
    from requests r join venues v on v.id = r.venue_id
    where r.venue_id in (${venueIds}) and ${requestWindow}
    group by 1
  `);

  const dayRows = await db.execute<{ date: string; requests: number; guests: number }>(sql`
    select to_char(r.created_at at time zone v.timezone, 'YYYY-MM-DD') as date,
      count(*)::int as requests, count(distinct r.device_id)::int as guests
    from requests r join venues v on v.id = r.venue_id
    where r.venue_id in (${venueIds})
      and (r.created_at at time zone v.timezone)::date
        between ${dayStart}::date and ${dayEnd}::date
    group by 1
  `);

  const tableRequestRows = await db.execute<{ label: string; requests: number }>(sql`
    select r.table_label as label, count(*)::int as requests
    from requests r
    where r.venue_id in (${venueIds}) and r.table_label is not null and ${requestWindow}
    group by r.table_label
  `);

  const tableScanRows = await db.execute<{ label: string; scans: number }>(sql`
    select q.label, coalesce(sum(q.scans), 0)::int as scans
    from qr_codes q
    where q.venue_id in (${venueIds})
    group by q.label
  `);

  const totals = totalsRow ?? {
    sessions: 0,
    requests: 0,
    declined: 0,
    played: 0,
    unique_guests: 0,
    scans: 0,
  };

  const requestsByHour = new Map(hourRows.map((row) => [row.hour, row.requests]));
  const daysByDate = new Map(dayRows.map((row) => [row.date, row]));
  const tables = new Map<string, { requests: number; scans: number }>();
  for (const row of tableRequestRows) {
    tables.set(row.label, { requests: row.requests, scans: 0 });
  }
  for (const row of tableScanRows) {
    const entry = tables.get(row.label) ?? { requests: 0, scans: 0 };
    entry.scans = row.scans;
    tables.set(row.label, entry);
  }

  return {
    totals: {
      sessions: totals.sessions,
      requests: totals.requests,
      uniqueGuests: totals.unique_guests,
      played: totals.played,
      declineRate: totals.requests === 0 ? 0 : totals.declined / totals.requests,
      scans: totals.scans,
    },
    topTracks: topRows.map((row) => ({
      title: row.title,
      artist: row.artist,
      artworkUrl: row.artwork_url,
      count: row.total,
    })),
    byHour: hours.map((hour) => ({ hour, requests: requestsByHour.get(hour) ?? 0 })),
    byDay: dayRange.map((date) => ({
      date,
      requests: daysByDate.get(date)?.requests ?? 0,
      guests: daysByDate.get(date)?.guests ?? 0,
    })),
    byTable: [...tables.entries()]
      .map(([label, value]) => ({ label, ...value }))
      .sort(
        (a, b) => b.requests - a.requests || b.scans - a.scans || a.label.localeCompare(b.label),
      ),
  };
}

export const adminAnalyticsRoutes: FastifyPluginAsync = async (app) => {
  const { db } = app.deps;

  registerAdminRoute(app, routes.adminAnalytics, async ({ query, org, user }) => {
    const to = query.to ? new Date(query.to) : new Date();
    const from = query.from
      ? new Date(query.from)
      : new Date(to.getTime() - defaultWindowDays * dayMs);
    if (from.getTime() > to.getTime()) throw badRequest("`from` must not be after `to`");
    let organizationId = org.organizationId;
    if (query.venueId) {
      const venue = await assertVenueAccess(app.deps, user, query.venueId, adminRoles);
      organizationId = venue.organizationId;
    }
    return loadAnalytics(db, { organizationId, venueId: query.venueId, from, to });
  });
};
