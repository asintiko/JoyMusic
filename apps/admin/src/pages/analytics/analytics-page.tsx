import { Ban, CalendarRange, ListMusic, Music2, Radio, Scan, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Chip, Cover, Input, Metric } from "@joymusic/ui";
import { BarChart } from "../../charts/bar-chart";
import { ChartCard } from "../../charts/chart-card";
import { HBarList } from "../../charts/hbar-list";
import { ChartLegend, LineChart } from "../../charts/line-chart";
import { DeclineMeter } from "../../charts/meter";
import { NoVenue } from "../../components/no-venue";
import { PageHeader, Panel, Toolbar } from "../../components/page";
import { ChartSkeleton, ErrorPanel, MetricSkeleton } from "../../components/states";
import { VenueSelect } from "../../components/venue-select";
import { RangeTabs } from "../../components/bits";
import { useI18n } from "../../i18n";
import {
  customRange,
  declineSeverity,
  fillHours,
  peakOf,
  presetRange,
  rangeDays,
  seriesOf,
  type DateRange,
  type RangePreset,
} from "../../lib/chart-data";
import { formatCompact, formatNumber, formatPercent, formatShortDay } from "../../lib/format";
import { useVenueScope } from "../../lib/venue-scope";
import { useAnalytics } from "../../queries";
import { Empty } from "../../components/empty";

function pad(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function AnalyticsPage() {
  const { t, locale } = useI18n();
  const scope = useVenueScope();
  const [days, setDays] = useState<RangePreset>(30);
  const [custom, setCustom] = useState(false);
  const [fromDate, setFromDate] = useState(() => isoDay(new Date(Date.now() - 13 * 86_400_000)));
  const [toDate, setToDate] = useState(() => isoDay(new Date()));

  const range = useMemo<DateRange>(() => {
    if (custom) return customRange(fromDate, toDate) ?? presetRange(days);
    return presetRange(days);
  }, [custom, fromDate, toDate, days]);
  const customInvalid = custom && customRange(fromDate, toDate) === null;

  const query = useAnalytics(scope.venueId, range, !scope.loading && scope.venues.length > 0);
  const data = query.data;
  const timezone = scope.selected?.timezone ?? scope.venues[0]?.timezone ?? "Asia/Tashkent";
  const faded = query.isPlaceholderData;
  const hours = data ? fillHours(data.byHour) : [];
  const peak = peakOf(hours);
  const dayLabels = data ? data.byDay.map((entry) => formatShortDay(entry.date, locale)) : [];

  const header = <PageHeader title={t("nav.analytics")} description={t("analytics.subtitle")} />;

  if (scope.loading) {
    return (
      <>
        {header}
        <ChartSkeleton />
      </>
    );
  }
  if (scope.venues.length === 0) {
    return (
      <>
        {header}
        <NoVenue />
      </>
    );
  }

  const severity = data ? declineSeverity(data.totals.declineRate) : "ok";
  const empty = data !== undefined && data.totals.requests === 0;

  return (
    <>
      {header}
      <Toolbar className="sticky top-0 z-sticky -mx-1 rounded-lg bg-canvas/85 px-1 py-2 backdrop-blur-md">
        <VenueSelect allowAll />
        <RangeTabs
          value={days}
          onChange={(next) => {
            setDays(next);
            setCustom(false);
          }}
        />
        <Chip
          size="md"
          selected={custom}
          icon={<CalendarRange aria-hidden="true" />}
          onClick={() => setCustom((value) => !value)}
        >
          {t("analytics.custom")}
        </Chip>
        {custom ? (
          <div className="flex items-center gap-2">
            <Input
              aria-label={t("analytics.from")}
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(event) => setFromDate(event.target.value)}
              wrapperClassName="w-[160px]"
            />
            <span className="text-fg-subtle">–</span>
            <Input
              aria-label={t("analytics.to")}
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(event) => setToDate(event.target.value)}
              wrapperClassName="w-[160px]"
            />
          </div>
        ) : null}
        {customInvalid ? (
          <Badge tone="danger" size="sm">
            {t("analytics.rangeInvalid")}
          </Badge>
        ) : null}
        <span className="type-mono ml-auto text-[12px] text-fg-subtle">
          {t("analytics.window", { days: rangeDays(range) })}
        </span>
      </Toolbar>

      {query.isError && !data ? (
        <Panel>
          <ErrorPanel error={query.error} onRetry={() => void query.refetch()} />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 min-[1180px]:grid-cols-3 min-[1360px]:grid-cols-6">
            {data ? (
              <>
                <Metric
                  label={t("kpi.sessions")}
                  value={formatNumber(data.totals.sessions, locale)}
                  icon={<Radio aria-hidden="true" />}
                />
                <Metric
                  label={t("kpi.requests")}
                  value={formatNumber(data.totals.requests, locale)}
                  icon={<ListMusic aria-hidden="true" />}
                />
                <Metric
                  label={t("kpi.guests")}
                  value={formatNumber(data.totals.uniqueGuests, locale)}
                  icon={<UserRound aria-hidden="true" />}
                />
                <Metric
                  label={t("kpi.played")}
                  value={formatNumber(data.totals.played, locale)}
                  icon={<Music2 aria-hidden="true" />}
                />
                <Metric
                  label={t("kpi.scans")}
                  value={formatNumber(data.totals.scans, locale)}
                  icon={<Scan aria-hidden="true" />}
                />
                <Metric
                  label={t("kpi.decline")}
                  value={formatPercent(data.totals.declineRate, locale)}
                  icon={<Ban aria-hidden="true" />}
                  sparkTone={
                    severity === "critical" ? "danger" : severity === "warning" ? "next" : "brand"
                  }
                />
              </>
            ) : (
              Array.from({ length: 6 }, (_unused, index) => <MetricSkeleton key={index} />)
            )}
          </div>

          {empty ? (
            <Panel>
              <Empty
                size="lg"
                illustration="search"
                title={t("analytics.empty.title")}
                description={t("analytics.empty.description")}
              />
            </Panel>
          ) : (
            <>
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
                    height={280}
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
                  <ChartSkeleton height={280} />
                )}
              </ChartCard>

              <div className="grid gap-4 min-[1180px]:grid-cols-2">
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
                      formatValue={(value) => formatCompact(value, locale)}
                      faded={faded}
                    />
                  ) : (
                    <ChartSkeleton />
                  )}
                </ChartCard>
                <Panel title={t("chart.declineRate")} subtitle={t("chart.declineRateNote")}>
                  {data ? (
                    <DeclineMeter
                      fraction={data.totals.declineRate}
                      valueLabel={formatPercent(data.totals.declineRate, locale)}
                      statusLabel={t(`chart.decline.${severity}`)}
                      ariaLabel={t("chart.declineRate")}
                    />
                  ) : (
                    <ChartSkeleton height={120} />
                  )}
                  {data ? (
                    <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--jm-line)] pt-4 text-[13px]">
                      <div>
                        <dt className="text-fg-subtle">{t("kpi.requests")}</dt>
                        <dd className="type-mono text-[18px] font-bold">
                          {formatNumber(data.totals.requests, locale)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-fg-subtle">{t("chart.declinedEstimate")}</dt>
                        <dd className="type-mono text-[18px] font-bold">
                          {formatNumber(
                            Math.round(data.totals.requests * data.totals.declineRate),
                            locale,
                          )}
                        </dd>
                      </div>
                    </dl>
                  ) : null}
                </Panel>
              </div>

              <div className="grid gap-4 min-[1180px]:grid-cols-2">
                <Panel title={t("chart.topTracks")} subtitle={t("chart.topTracksNote")}>
                  {data ? (
                    data.topTracks.length > 0 ? (
                      <HBarList
                        numbered
                        compact
                        ariaLabel={t("chart.topTracks")}
                        rows={data.topTracks.map((track, index) => ({
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
                    <ChartSkeleton height={260} />
                  )}
                </Panel>
                <Panel title={t("chart.byTable")} subtitle={t("chart.byTableNote")}>
                  {data ? (
                    data.byTable.length > 0 ? (
                      <HBarList
                        ariaLabel={t("chart.byTable")}
                        compact
                        rows={[...data.byTable]
                          .sort((a, b) => b.requests - a.requests)
                          .slice(0, 10)
                          .map((row) => ({
                            key: row.label,
                            label: row.label,
                            value: row.requests,
                            secondary: `${formatNumber(row.scans, locale)} ${t("chart.scansShort")}`,
                          }))}
                      />
                    ) : (
                      <Empty
                        size="sm"
                        illustration="qr"
                        title={t("chart.noData")}
                        description={t("chart.noDataHint")}
                      />
                    )
                  ) : (
                    <ChartSkeleton height={260} />
                  )}
                </Panel>
              </div>
            </>
          )}
          <p className="text-[12px] text-fg-subtle">{t("analytics.scansNote")}</p>
        </div>
      )}
    </>
  );
}
