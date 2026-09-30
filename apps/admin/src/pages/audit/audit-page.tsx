import { Activity, Building2, Ban, QrCode, Store, UserCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Avatar,
  Select,
  SearchInput,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  Tooltip,
} from "@joymusic/ui";
import { PageHeader, Toolbar } from "../../components/page";
import { ErrorPanel, TableSkeleton } from "../../components/states";
import { useI18n } from "../../i18n";
import {
  auditGroups,
  describeAudit,
  filterAudit,
  renderAudit,
  type AuditGroup,
} from "../../lib/audit";
import { formatDateTime, formatRelative } from "../../lib/format";
import { useAudit } from "../../queries";
import { Empty } from "../../components/empty";

const groupIcons: Record<AuditGroup, LucideIcon> = {
  venue: Store,
  qr: QrCode,
  member: UserCog,
  moderation: Ban,
  organization: Building2,
  other: Activity,
};

export function AuditPage() {
  const { t, locale } = useI18n();
  const [limit, setLimit] = useState(100);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<AuditGroup | "all">("all");
  const [actor, setActor] = useState<string>("all");
  const audit = useAudit(limit);

  const render = useMemo(
    () => (entry: Parameters<typeof renderAudit>[1]) => renderAudit(t, entry),
    [t],
  );

  const actors = useMemo(
    () => [...new Set((audit.data ?? []).map((entry) => entry.actorName))].sort(),
    [audit.data],
  );
  const rows = useMemo(
    () => filterAudit(audit.data ?? [], { query, group, actor }, render),
    [audit.data, query, group, actor, render],
  );

  return (
    <>
      <PageHeader title={t("nav.audit")} description={t("audit.subtitle")} />
      <Toolbar>
        <SearchInput
          aria-label={t("common.search")}
          placeholder={t("audit.searchPlaceholder")}
          value={query}
          onValueChange={setQuery}
          wrapperClassName="w-full max-w-[300px]"
        />
        <Select
          aria-label={t("audit.filter.group")}
          value={group}
          onChange={(event) => setGroup(event.target.value as AuditGroup | "all")}
          wrapperClassName="w-[190px]"
        >
          <option value="all">{t("audit.filter.allGroups")}</option>
          {auditGroups.map((entry) => (
            <option key={entry} value={entry}>
              {t(`audit.group.${entry}`)}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t("audit.filter.actor")}
          value={actor}
          onChange={(event) => setActor(event.target.value)}
          wrapperClassName="w-[190px]"
        >
          <option value="all">{t("audit.filter.allActors")}</option>
          {actors.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t("audit.filter.limit")}
          value={String(limit)}
          onChange={(event) => setLimit(Number(event.target.value))}
          wrapperClassName="w-[176px]"
        >
          {[50, 100, 200].map((value) => (
            <option key={value} value={value}>
              {t("audit.limitOption", { count: value })}
            </option>
          ))}
        </Select>
        <span className="type-mono ml-auto text-[12px] text-fg-subtle">
          {rows.length} / {audit.data?.length ?? 0}
        </span>
      </Toolbar>
      {audit.isError ? (
        <ErrorPanel error={audit.error} onRetry={() => void audit.refetch()} />
      ) : audit.isPending ? (
        <TableSkeleton rows={8} columns={3} />
      ) : rows.length === 0 ? (
        <div className="rounded-lg bg-surface-1 hairline">
          <Empty
            size="lg"
            illustration={audit.data.length === 0 ? "inbox" : "search"}
            title={audit.data.length === 0 ? t("audit.empty.title") : t("common.noResults")}
            description={
              audit.data.length === 0 ? t("audit.empty.description") : t("common.noResultsHint")
            }
          />
        </div>
      ) : (
        <Table aria-label={t("nav.audit")}>
          <TableHead>
            <TableRow interactive={false}>
              <TableHeaderCell>{t("audit.col.event")}</TableHeaderCell>
              <TableHeaderCell>{t("audit.col.actor")}</TableHeaderCell>
              <TableHeaderCell>{t("audit.col.group")}</TableHeaderCell>
              <TableHeaderCell numeric>{t("audit.col.when")}</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((entry) => {
              const description = describeAudit(entry);
              const Icon = groupIcons[description.group];
              return (
                <TableRow key={entry.id} data-testid="audit-row">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm bg-surface-3 text-fg-muted">
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      <span className="font-semibold">
                        {t(description.key, description.params)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 text-fg-muted">
                      <Avatar name={entry.actorName} size={22} />
                      {entry.actorName}
                    </span>
                  </TableCell>
                  <TableCell muted>{t(`audit.group.${description.group}`)}</TableCell>
                  <TableCell numeric muted>
                    <Tooltip content={formatDateTime(entry.createdAt, locale)}>
                      <span tabIndex={0} className="type-mono text-[12px]">
                        {formatRelative(entry.createdAt, locale)}
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </>
  );
}
