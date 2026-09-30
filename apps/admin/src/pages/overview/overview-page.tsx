import { Link, useNavigate } from "@tanstack/react-router";
import { useQueries } from "@tanstack/react-query";
import {
  Ban,
  ListMusic,
  Plus,
  QrCode,
  Scan,
  ShieldCheck,
  Store,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Cover,
  Metric,
  Sparkline,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@joymusic/ui";
import type { AdminVenue, AnalyticsOverview } from "@joymusic/shared";
import { BarChart } from "../../charts/bar-chart";
import { ChartCard } from "../../charts/chart-card";
import { HBarList } from "../../charts/hbar-list";
import { ChartLegend, LineChart } from "../../charts/line-chart";
import { ChartSkeleton, ErrorPanel, MetricSkeleton, TableSkeleton } from "../../components/states";
import { LiveBadge, RangeTabs, ThemeBadge, VenueAvatar } from "../../components/bits";
import { PageHeader, Panel } from "../../components/page";
import { useI18n } from "../../i18n";
import { api } from "../../lib/api";
import {
  deltaFraction,
  fillHours,
  peakOf,
  presetRange,
  previousRange,
  seriesOf,
  trendOf,
  type RangePreset,
} from "../../lib/chart-data";
import {
  formatCompact,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatShortDay,
  formatSignedPercent,
} from "../../lib/format";
import { useVenueScope } from "../../lib/venue-scope";
import { queryKeys, useAnalytics, useSessions } from "../../queries";
import { useOrganizationId } from "../../lib/use-session";
import { Empty } from "../../components/empty";

function pad(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function LiveSessions({ venues }: { venues: AdminVenue[] }) {
  const { t, locale } = useI18n();
  const live = venues.filter((venue) => venue.activeSessionId).slice(0, 4);
  return (
    <Panel title={t("overview.live")} subtitle={t("overview.liveNote")} className="h-full">
      {live.length === 0 ? (
        <Empty
          size="sm"
          illustration="queue"
          title={t("overview.liveEmpty")}
          description={t("overview.liveEmptyHint")}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {live.map((venue) => (
            <LiveRow key={venue.id} venue={venue} locale={locale} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function LiveRow({ venue, locale }: { venue: AdminVenue; locale: "uz" | "ru" | "en" }) {
  const { t } = useI18n();
  const sessions = useSessions(venue.id, 1);
  const current = sessions.data?.find((entry) => entry.endedAt === null);
  return (
    <li>
      <Link
        to="/sessions"
        className="focus-ring flex items-center gap-3 rounded-md bg-surface-2 p-3 transition-colors hover:bg-surface-3"
      >
        <VenueAvatar venue={venue} size={32} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-[13.5px] font-bold">{venue.name}</p>
          <p className="truncate text-[12px] text-fg-muted">
            {current
              ? `${current.djName} · ${formatDateTime(current.startedAt, locale, venue.timezone)}`
              : " "}
          </p>
        </div>
        <div className="text-right leading-tight">
          <p className="type-mono text-[15px] font-bold">
            {current ? formatNumber(current.requestsTotal, locale) : "–"}
          </p>
          <p className="text-[11px] text-fg-subtle">{t("overview.requestsShort")}</p>
        </div>
        <span
          className="jm-pulse-dot size-2 rounded-full bg-playing"
          aria-label={t("status.live")}
        />
      </Link>
    </li>
  );
}

function QuickActions() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const actions = [
    { icon: Plus, label: t("venues.new"), run: () => void navigate({ to: "/venues/new" }) },
    {
      icon: QrCode,
      label: t("qr.newCode"),
      run: () => void navigate({ to: "/qr", search: { new: 1 } }),
    },
    {
      icon: UserPlus,
      label: t("team.invite"),
      run: () => void navigate({ to: "/djs", search: { invite: 1 } }),
    },
    {
      icon: ShieldCheck,
      label: t("moderation.addWord"),
      run: () => void navigate({ to: "/moderation", search: { focus: "word" } }),
    },
  ];
  return (
    <Panel title={t("overview.quickActions")} className="h-full">
      <div className="grid grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.run}
            className="focus-ring flex h-[72px] flex-col items-start justify-between rounded-md bg-surface-2 p-3 text-left text-[13px] font-bold transition-[background-color,transform] hover:bg-surface-3 active:scale-[0.98]"
          >
            <action.icon aria-hidden="true" className="size-[18px] text-brand" />
            {action.label}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function VenueTable({ venues, days }: { venues: AdminVenue[]; days: RangePreset }) {
  const { t, locale } = useI18n();
  const org = useOrganizationId();
  const navigate = useNavigate();
  const range = useMemo(() => presetRange(days), [days]);
  const shown = venues.slice(0, 8);
  const results = useQueries({
    queries: shown.map((venue) => ({
      queryKey: queryKeys.analytics(org, venue.id, range),
      queryFn: () =>
        api.call("adminAnalytics", {
          query: { venueId: venue.id, from: range.from, to: range.to },
        }),
      staleTime: 60_000,
    })),
  });
  return (
    <Table aria-label={t("nav.venues")}>
      <TableHead>
        <TableRow interactive={false}>
          <TableHeaderCell>{t("venues.col.venue")}</TableHeaderCell>
          <TableHeaderCell>{t("venues.col.city")}</TableHeaderCell>
          <TableHeaderCell>{t("venues.col.theme")}</TableHeaderCell>
          <TableHeaderCell numeric>{t("venues.col.requests")}</TableHeaderCell>
          <TableHeaderCell>{t("venues.col.trend")}</TableHeaderCell>
          <TableHeaderCell>{t("venues.col.status")}</TableHeaderCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {shown.map((venue, index) => {
          const data: AnalyticsOverview | undefined = results[index]?.data;
          return (
            <TableRow
              key={venue.id}
              className="cursor-pointer"
              onClick={() =>
                void navigate({ to: "/venues/$venueId", params: { venueId: venue.id } })
              }
            >
              <TableCell className="font-bold">
                <Link
                  to="/venues/$venueId"
                  params={{ venueId: venue.id }}
                  className="focus-ring flex items-center gap-2.5 rounded-xs"
                  onClick={(event) => event.stopPropagation()}
                >
                  <VenueAvatar venue={venue} />
                  {venue.name}
                </Link>
              </TableCell>
              <TableCell muted>{venue.city ?? "–"}</TableCell>
              <TableCell>
                <ThemeBadge theme={venue.theme} />
              </TableCell>
              <TableCell numeric mono className="font-bold">
                {data ? formatNumber(data.totals.requests, locale) : "…"}
              </TableCell>
              <TableCell>
                {data ? (
                  <Sparkline
                    values={seriesOf(data.byDay, "requests")}
                    width={84}
                    height={22}
                    fill={false}
                    label={t("overview.trend")}
                  />
                ) : null}
              </TableCell>
              <TableCell>
                <LiveBadge venue={venue} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function OverviewPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const scope = useVenueScope();
  const [days, setDays] = useState<RangePreset>(7);
  const range = useMemo(() => presetRange(days), [days]);
  const previous = useMemo(() => previousRange(range), [range]);
  const current = useAnalytics(scope.venueId, range, !scope.loading);
  const before = useAnalytics(scope.venueId, previous, !scope.loading);

  const timezone = scope.selected?.timezone ?? scope.venues[0]?.timezone ?? "Asia/Tashkent";

  const header = (
    <PageHeader
      title={t("nav.overview")}
      description={t("overview.subtitle", {
        range: t(`range.d${days}` as "range.d7"),
        scope: scope.selected ? scope.selected.name : t("shell.allVenues"),
      })}
      actions={
        <>
          <RangeTabs value={days} onChange={setDays} />
          <Button
            leftIcon={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => void navigate({ to: "/venues/new" })}
          >
            {t("venues.new")}
          </Button>
        </>
      }
    />
  );

  if (!scope.loading && scope.venues.length === 0) {
    return (
      <>
        {header}
        <Panel>
          <Empty
            size="lg"
            illustration="qr"
            title={t("overview.empty.title")}
            description={t("overview.empty.description")}
            action={
              <Button
                leftIcon={<Plus aria-hidden="true" className="size-4" />}
                onClick={() => void navigate({ to: "/venues/new" })}
              >
                {t("venues.createFirst")}
              </Button>
            }
          />
        </Panel>
      </>
    );
  }

  if (current.isError && !current.data) {
    return (
      <>
        {header}
        <Panel>
          <ErrorPanel error={current.error} onRetry={() => void current.refetch()} />
        </Panel>
      </>
    );
  }

  const data = current.data;
  const prior = before.data;
  const hours = data ? fillHours(data.byHour) : [];
  const peak = peakOf(hours);
  const faded = current.isPlaceholderData;

  const delta = (now: number | undefined, then: number | undefined) =>
    now === undefined || then === undefined ? null : deltaFraction(now, then);
  const requestsDelta = delta(data?.totals.requests, prior?.totals.requests);
  const guestsDelta = delta(data?.totals.uniqueGuests, prior?.totals.uniqueGuests);
  const declineDelta = data && prior ? data.totals.declineRate - prior.totals.declineRate : null;

  const deltaText = (value: number | null) =>
    value === null ? undefined : formatSignedPercent(value, locale);

  const dayLabels = data ? data.byDay.map((entry) => formatShortDay(entry.date, locale)) : [];

  return (
    <>
      {header}
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 min-[1180px]:grid-cols-4">
          {data ? (
            <>
              <Metric
                label={t("kpi.requests")}
                value={formatNumber(data.totals.requests, locale)}
                delta={deltaText(requestsDelta)}
                trend={trendOf(requestsDelta)}
                icon={<ListMusic aria-hidden="true" />}
                spark={seriesOf(data.byDay, "requests")}
              />
              <Metric
                label={t("kpi.guests")}
                value={formatNumber(data.totals.uniqueGuests, locale)}
                delta={deltaText(guestsDelta)}
                trend={trendOf(guestsDelta)}
                icon={<UserRound aria-hidden="true" />}
                spark={seriesOf(data.byDay, "guests")}
                sparkTone="playing"
              />
              <Metric
                label={t("kpi.scans")}
                value={formatNumber(data.totals.scans, locale)}
                icon={<Scan aria-hidden="true" />}
              />
              <Metric
                label={t("kpi.decline")}
                value={formatPercent(data.totals.declineRate, locale)}
                delta={
                  declineDelta === null
                    ? undefined
                    : `${declineDelta > 0 ? "+" : declineDelta < 0 ? "−" : ""}${Math.abs(declineDelta * 100).toFixed(1)} ${t("unit.pp")}`
                }
                trend={trendOf(declineDelta)}
                goodWhen="down"
                icon={<Ban aria-hidden="true" />}
              />
            </>
          ) : (
            <>
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
              <MetricSkeleton />
            </>
          )}
        </div>

        <div className="grid gap-4 min-[1180px]:grid-cols-[minmax(0,1fr)_400px]">
          <ChartCard
            title={t("chart.byHour")}
            subtitle={t("chart.byHourNote", { tz: timezone })}
            badge={
              peak ? (
                <Badge tone="brand" size="sm">
                  {t("chart.peak", { hour: pad(peak.index) })}
                </Badge>
              ) : undefined
            }
            table={{
              columns: [t("chart.hour"), t("chart.requests")],
              rows: hours.map((value, hour) => [pad(hour), formatNumber(value, locale)]),
            }}
          >
            {data ? (
              <BarChart
                data={hours.map((value, hour) => ({
                  label: String(hour).padStart(2, "0"),
                  caption: pad(hour),
                  value,
                }))}
                seriesName={t("chart.requests")}
                ariaLabel={t("chart.byHour")}
                height={292}
                formatValue={(value) => formatCompact(value, locale)}
                faded={faded}
              />
            ) : (
              <ChartSkeleton />
            )}
          </ChartCard>
          <Panel title={t("chart.topTracks")} subtitle={t("chart.topTracksNote")}>
            {data ? (
              data.topTracks.length > 0 ? (
                <HBarList
                  numbered
                  compact
                  ariaLabel={t("chart.topTracks")}
                  rows={data.topTracks.slice(0, 5).map((track, index) => ({
                    key: `${track.title}-${track.artist}-${index}`,
                    label: track.title,
                    sublabel: track.artist,
                    value: track.count,
                    leading: (
                      <Cover
                        src={track.artworkUrl}
                        seed={`${track.artist}-${track.title}`}
                        size={36}
                        radius="sm"
                      />
                    ),
                  }))}
                />
              ) : (
                <Empty
                  size="sm"
                  illustration="search"
                  title={t("chart.noData")}
                  description={t("chart.noDataHint")}
                />
              )
            ) : (
              <ChartSkeleton height={220} />
            )}
          </Panel>
        </div>

        <div className="grid gap-4 min-[1180px]:grid-cols-[minmax(0,1fr)_400px]">
          <ChartCard
            title={t("chart.overTime")}
            subtitle={t("chart.overTimeNote")}
            legend={
              <ChartLegend
                series={[
                  { id: "requests", label: t("chart.requests"), color: "var(--chart-1)" },
                  { id: "guests", label: t("chart.guests"), color: "var(--chart-2)" },
                ]}
              />
            }
            table={
              data
                ? {
                    columns: [t("chart.date"), t("chart.requests"), t("chart.guests")],
                    rows: data.byDay.map((entry, index) => [
                      dayLabels[index] ?? entry.date,
                      formatNumber(entry.requests, locale),
                      formatNumber(entry.guests, locale),
                    ]),
                  }
                : undefined
            }
          >
            {data ? (
              <LineChart
                xLabels={dayLabels}
                ariaLabel={t("chart.overTime")}
                formatValue={(value) => formatCompact(value, locale)}
                faded={faded}
                series={[
                  {
                    id: "requests",
                    label: t("chart.requests"),
                    color: "var(--chart-1)",
                    values: seriesOf(data.byDay, "requests"),
                  },
                  {
                    id: "guests",
                    label: t("chart.guests"),
                    color: "var(--chart-2)",
                    values: seriesOf(data.byDay, "guests"),
                  },
                ]}
              />
            ) : (
              <ChartSkeleton />
            )}
          </ChartCard>
          <div className="grid gap-4">
            <LiveSessions venues={scope.venues} />
            <QuickActions />
          </div>
        </div>

        <section aria-labelledby="overview-venues" className="mt-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="overview-venues" className="type-title-sm">
              {t("nav.venues")}
            </h2>
            <Link
              to="/venues"
              className="focus-ring inline-flex items-center gap-1.5 rounded-xs text-[13px] font-bold text-brand hover:underline"
            >
              <Store aria-hidden="true" className="size-4" />
              {t("overview.allVenues")}
            </Link>
          </div>
          {scope.loading ? (
            <TableSkeleton rows={4} columns={6} />
          ) : (
            <VenueTable venues={scope.venues} days={days} />
          )}
        </section>
      </div>
    </>
  );
}
