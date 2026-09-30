import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Button,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type SortDirection,
} from "@joymusic/ui";
import { LiveBadge, ThemeBadge, VenueAvatar } from "../../components/bits";
import { PageHeader, Toolbar } from "../../components/page";
import { ErrorPanel, TableSkeleton } from "../../components/states";
import { useI18n } from "../../i18n";
import { formatDate } from "../../lib/format";
import { useSingleKey } from "../../shell/use-chord";
import { useVenues } from "../../queries";
import { Empty } from "../../components/empty";

type SortKey = "name" | "city" | "createdAt";

export function VenuesPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const venues = useVenues();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; direction: Exclude<SortDirection, null> }>({
    key: "createdAt",
    direction: "desc",
  });

  useSingleKey("n", () => void navigate({ to: "/venues/new" }));

  const rows = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = (venues.data ?? []).filter(
      (venue) =>
        !normalized ||
        venue.name.toLowerCase().includes(normalized) ||
        venue.slug.includes(normalized) ||
        (venue.city ?? "").toLowerCase().includes(normalized),
    );
    const factor = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left =
        sort.key === "city" ? (a.city ?? "") : sort.key === "name" ? a.name : a.createdAt;
      const right =
        sort.key === "city" ? (b.city ?? "") : sort.key === "name" ? b.name : b.createdAt;
      return left.localeCompare(right) * factor;
    });
  }, [venues.data, query, sort]);

  const toggle = (key: SortKey) =>
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const directionOf = (key: SortKey): SortDirection => (sort.key === key ? sort.direction : null);

  return (
    <>
      <PageHeader
        title={t("nav.venues")}
        description={t("venues.subtitle")}
        actions={
          <Button
            leftIcon={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => void navigate({ to: "/venues/new" })}
          >
            {t("venues.new")}
          </Button>
        }
      />
      {venues.isError ? (
        <ErrorPanel error={venues.error} onRetry={() => void venues.refetch()} />
      ) : venues.isPending ? (
        <TableSkeleton rows={5} columns={6} />
      ) : venues.data.length === 0 ? (
        <div className="rounded-lg bg-surface-1 hairline">
          <Empty
            size="lg"
            illustration="qr"
            title={t("venues.empty.title")}
            description={t("venues.empty.description")}
            action={
              <Button
                leftIcon={<Plus aria-hidden="true" className="size-4" />}
                onClick={() => void navigate({ to: "/venues/new" })}
              >
                {t("venues.createFirst")}
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <Toolbar>
            <SearchInput
              aria-label={t("common.search")}
              placeholder={t("venues.searchPlaceholder")}
              value={query}
              onValueChange={setQuery}
              wrapperClassName="w-full max-w-[320px]"
            />
            <span className="type-mono ml-auto text-[12px] text-fg-subtle">
              {rows.length} / {venues.data.length}
            </span>
          </Toolbar>
          {rows.length === 0 ? (
            <div className="rounded-lg bg-surface-1 hairline">
              <Empty
                size="md"
                illustration="search"
                title={t("common.noResults")}
                description={t("common.noResultsHint")}
              />
            </div>
          ) : (
            <Table aria-label={t("nav.venues")}>
              <TableHead>
                <TableRow interactive={false}>
                  <TableHeaderCell
                    sortable
                    direction={directionOf("name")}
                    onSort={() => toggle("name")}
                  >
                    {t("venues.col.venue")}
                  </TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    direction={directionOf("city")}
                    onSort={() => toggle("city")}
                  >
                    {t("venues.col.city")}
                  </TableHeaderCell>
                  <TableHeaderCell>{t("venues.col.theme")}</TableHeaderCell>
                  <TableHeaderCell>{t("venues.col.requestsOpen")}</TableHeaderCell>
                  <TableHeaderCell
                    sortable
                    direction={directionOf("createdAt")}
                    onSort={() => toggle("createdAt")}
                  >
                    {t("venues.col.created")}
                  </TableHeaderCell>
                  <TableHeaderCell>{t("venues.col.status")}</TableHeaderCell>
                  <TableHeaderCell className="w-10">
                    <span className="sr-only">{t("common.open")}</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((venue) => (
                  <TableRow
                    key={venue.id}
                    className="group/row cursor-pointer"
                    onClick={() =>
                      void navigate({ to: "/venues/$venueId", params: { venueId: venue.id } })
                    }
                  >
                    <TableCell>
                      <Link
                        to="/venues/$venueId"
                        params={{ venueId: venue.id }}
                        onClick={(event) => event.stopPropagation()}
                        className="focus-ring flex items-center gap-3 rounded-xs"
                      >
                        <VenueAvatar venue={venue} size={32} />
                        <span className="min-w-0 leading-tight">
                          <span className="block truncate font-bold">{venue.name}</span>
                          <span className="type-mono block truncate text-[11.5px] text-fg-subtle">
                            /{venue.slug}
                          </span>
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell muted>{venue.city ?? "–"}</TableCell>
                    <TableCell>
                      <ThemeBadge theme={venue.theme} />
                    </TableCell>
                    <TableCell muted>
                      {venue.settings.requestsOpen ? t("common.yes") : t("common.no")}
                    </TableCell>
                    <TableCell muted>{formatDate(venue.createdAt, locale)}</TableCell>
                    <TableCell>
                      <LiveBadge venue={venue} />
                    </TableCell>
                    <TableCell>
                      <ArrowRight
                        aria-hidden="true"
                        className="size-4 text-fg-disabled transition-transform group-hover/row:translate-x-0.5 group-hover/row:text-fg-muted"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </>
  );
}
