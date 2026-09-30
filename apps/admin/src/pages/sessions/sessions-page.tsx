import { useMemo } from "react";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@joymusic/ui";
import { NoVenue } from "../../components/no-venue";
import { PageHeader } from "../../components/page";
import { ErrorPanel, TableSkeleton } from "../../components/states";
import { VenueSelect } from "../../components/venue-select";
import { useI18n } from "../../i18n";
import {
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
  sessionDuration,
} from "../../lib/format";
import { useVenueScope } from "../../lib/venue-scope";
import { useSessions } from "../../queries";
import { Empty } from "../../components/empty";

export function SessionsPage() {
  const { t, locale } = useI18n();
  const scope = useVenueScope();
  const venue = scope.effective;
  const sessions = useSessions(venue?.id, 50);
  const units = { hours: t("unit.h"), minutes: t("unit.min") };

  const summary = useMemo(() => {
    const list = sessions.data ?? [];
    const finished = list.filter((entry) => entry.endedAt);
    const durations = finished.map((entry) => sessionDuration(entry.startedAt, entry.endedAt));
    return {
      total: list.length,
      requests: list.reduce((sum, entry) => sum + entry.requestsTotal, 0),
      played: list.reduce((sum, entry) => sum + entry.playedTotal, 0),
      average:
        durations.length > 0
          ? durations.reduce((sum, value) => sum + value, 0) / durations.length
          : 0,
    };
  }, [sessions.data]);

  const header = (
    <PageHeader
      title={t("nav.sessions")}
      description={t("sessions.subtitle")}
      actions={<VenueSelect />}
    />
  );

  if (scope.loading) {
    return (
      <>
        {header}
        <TableSkeleton rows={6} columns={6} />
      </>
    );
  }
  if (!venue) {
    return (
      <>
        {header}
        <NoVenue />
      </>
    );
  }

  return (
    <>
      {header}
      {sessions.isError ? (
        <ErrorPanel error={sessions.error} onRetry={() => void sessions.refetch()} />
      ) : sessions.isPending ? (
        <TableSkeleton rows={6} columns={6} />
      ) : sessions.data.length === 0 ? (
        <div className="rounded-lg bg-surface-1 hairline">
          <Empty
            size="lg"
            illustration="queue"
            title={t("sessions.empty.title")}
            description={t("sessions.empty.description")}
          />
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 min-[1000px]:grid-cols-4">
            {[
              { label: t("sessions.stat.total"), value: formatNumber(summary.total, locale) },
              { label: t("sessions.stat.requests"), value: formatNumber(summary.requests, locale) },
              { label: t("sessions.stat.played"), value: formatNumber(summary.played, locale) },
              {
                label: t("sessions.stat.average"),
                value: summary.average > 0 ? formatDuration(summary.average, units) : "–",
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-surface-1 px-4 py-3 hairline">
                <p className="type-eyebrow text-fg-subtle">{stat.label}</p>
                <p className="type-mono-lg mt-1 text-[24px] font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
          <Table aria-label={t("nav.sessions")}>
            <TableHead>
              <TableRow interactive={false}>
                <TableHeaderCell>{t("sessions.col.dj")}</TableHeaderCell>
                <TableHeaderCell>{t("sessions.col.started")}</TableHeaderCell>
                <TableHeaderCell>{t("sessions.col.duration")}</TableHeaderCell>
                <TableHeaderCell numeric>{t("sessions.col.requests")}</TableHeaderCell>
                <TableHeaderCell numeric>{t("sessions.col.played")}</TableHeaderCell>
                <TableHeaderCell>{t("sessions.col.playedShare")}</TableHeaderCell>
                <TableHeaderCell>{t("venues.col.status")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.data.map((entry) => {
                const share = entry.requestsTotal > 0 ? entry.playedTotal / entry.requestsTotal : 0;
                return (
                  <TableRow key={entry.id} data-testid="session-row">
                    <TableCell className="font-bold">{entry.djName}</TableCell>
                    <TableCell muted>
                      {formatDateTime(entry.startedAt, locale, venue.timezone)}
                    </TableCell>
                    <TableCell mono>
                      {formatDuration(sessionDuration(entry.startedAt, entry.endedAt), units)}
                    </TableCell>
                    <TableCell numeric mono className="font-bold">
                      {formatNumber(entry.requestsTotal, locale)}
                    </TableCell>
                    <TableCell numeric mono className="font-bold">
                      {formatNumber(entry.playedTotal, locale)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="h-full rounded-full bg-[var(--chart-1)]"
                            style={{ width: `${Math.round(share * 100)}%` }}
                          />
                        </div>
                        <span className="type-mono text-[11.5px] text-fg-muted">
                          {formatPercent(share, locale, 0)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {entry.endedAt ? (
                        <Badge size="sm" tone="neutral">
                          {t("sessions.status.ended")}
                        </Badge>
                      ) : (
                        <Badge size="sm" tone="playing" dot>
                          {t("status.live")}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </>
      )}
    </>
  );
}
