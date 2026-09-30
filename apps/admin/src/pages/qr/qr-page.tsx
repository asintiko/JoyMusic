import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Copy, MoreHorizontal, Pencil, Plus, QrCode as QrIcon, Store, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Badge,
  Button,
  IconButton,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  useToast,
} from "@joymusic/ui";
import type { QrCode } from "@joymusic/shared";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { copyText } from "../../components/copy-button";
import { Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "../../components/menu";
import { PageHeader } from "../../components/page";
import { ErrorPanel, TableSkeleton } from "../../components/states";
import { useI18n } from "../../i18n";
import { errorText } from "../../lib/error-messages";
import { formatNumber } from "../../lib/format";
import { naturalCompare } from "../../lib/qr-studio";
import { useVenueScope } from "../../lib/venue-scope";
import { useDeleteQr, useQrCodes, useUpdateQr } from "../../queries";
import { CreateCodeDialog, RenameCodeDialog } from "./qr-dialogs";
import { StudioPanel } from "./studio-panel";
import { Empty } from "../../components/empty";

export function QrPage() {
  const { t, locale } = useI18n();
  const toast = useToast();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { new?: number };
  const scope = useVenueScope();
  const venue = scope.effective;
  const codesQuery = useQrCodes(venue?.id);
  const update = useUpdateQr(venue?.id ?? "");
  const remove = useDeleteQr(venue?.id ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<QrCode | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QrCode | null>(null);

  const codes = useMemo(
    () => [...(codesQuery.data ?? [])].sort((a, b) => naturalCompare(a.label, b.label)),
    [codesQuery.data],
  );
  const selected = codes.find((entry) => entry.id === selectedId) ?? codes[0] ?? null;

  useEffect(() => {
    if (search.new && venue) {
      setCreateOpen(true);
      void navigate({ to: "/qr", search: {}, replace: true });
    }
  }, [search.new, venue, navigate]);

  const totals = useMemo(
    () => ({
      scans: codes.reduce((sum, entry) => sum + entry.scans, 0),
      active: codes.filter((entry) => entry.active).length,
    }),
    [codes],
  );

  const toggleActive = async (code: QrCode, active: boolean) => {
    try {
      await update.mutateAsync({ id: code.id, active });
      toast.success(
        active ? t("qr.enabled", { label: code.label }) : t("qr.disabled", { label: code.label }),
      );
    } catch (error) {
      toast.error(t("qr.updateFailed"), errorText(t, error));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    try {
      await remove.mutateAsync(target.id);
      toast.success(t("qr.deleted", { label: target.label }));
    } catch (error) {
      toast.error(t("qr.deleteFailed"), errorText(t, error));
    }
  };

  const header = (
    <PageHeader
      title={t("nav.qr")}
      description={t("qr.subtitle")}
      actions={
        <>
          {scope.venues.length > 1 ? (
            <Select
              aria-label={t("shell.venuePicker")}
              value={venue?.id ?? ""}
              onChange={(event) => scope.setVenueId(event.target.value)}
              wrapperClassName="w-[220px]"
            >
              {scope.venues.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Button
            disabled={!venue}
            leftIcon={<Plus aria-hidden="true" className="size-4" />}
            onClick={() => setCreateOpen(true)}
          >
            {t("qr.newCode")}
          </Button>
        </>
      }
    />
  );

  if (scope.loading) {
    return (
      <>
        {header}
        <TableSkeleton rows={6} columns={4} />
      </>
    );
  }

  if (!venue) {
    return (
      <>
        {header}
        <div className="rounded-lg bg-surface-1 hairline">
          <Empty
            size="lg"
            illustration="qr"
            title={t("qr.noVenue.title")}
            description={t("qr.noVenue.description")}
            action={
              <Link
                to="/venues/new"
                className="focus-ring inline-flex h-10 items-center gap-2 rounded-md bg-brand-gradient-strong px-4 text-[14px] font-bold text-on-brand"
              >
                <Store aria-hidden="true" className="size-4" />
                {t("venues.createFirst")}
              </Link>
            }
          />
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="grid items-start gap-5 min-[1280px]:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          <div className="mb-4 grid grid-cols-3 gap-3">
            {[
              { label: t("qr.stat.codes"), value: formatNumber(codes.length, locale) },
              { label: t("qr.stat.active"), value: formatNumber(totals.active, locale) },
              { label: t("qr.stat.scans"), value: formatNumber(totals.scans, locale) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg bg-surface-1 px-4 py-3 hairline">
                <p className="type-eyebrow text-fg-subtle">{stat.label}</p>
                <p className="type-mono-lg mt-1 text-[24px] font-bold">{stat.value}</p>
              </div>
            ))}
          </div>
          {codesQuery.isError ? (
            <ErrorPanel error={codesQuery.error} onRetry={() => void codesQuery.refetch()} />
          ) : codesQuery.isPending ? (
            <TableSkeleton rows={6} columns={4} />
          ) : codes.length === 0 ? (
            <div className="rounded-lg bg-surface-1 hairline">
              <Empty
                size="lg"
                illustration="qr"
                title={t("qr.empty.title")}
                description={t("qr.empty.description")}
                action={
                  <Button
                    leftIcon={<Plus aria-hidden="true" className="size-4" />}
                    onClick={() => setCreateOpen(true)}
                  >
                    {t("qr.newCode")}
                  </Button>
                }
              />
            </div>
          ) : (
            <Table aria-label={t("nav.qr")}>
              <TableHead>
                <TableRow interactive={false}>
                  <TableHeaderCell>{t("qr.col.label")}</TableHeaderCell>
                  <TableHeaderCell numeric>{t("qr.col.scans")}</TableHeaderCell>
                  <TableHeaderCell>{t("qr.col.active")}</TableHeaderCell>
                  <TableHeaderCell className="w-10">
                    <span className="sr-only">{t("common.actions")}</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {codes.map((code) => (
                  <TableRow
                    key={code.id}
                    selected={selected?.id === code.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedId(code.id)}
                    data-testid="qr-row"
                  >
                    <TableCell className="font-bold">
                      <button
                        type="button"
                        onClick={() => setSelectedId(code.id)}
                        className="focus-ring flex items-center gap-2.5 rounded-xs text-left"
                        aria-pressed={selected?.id === code.id}
                      >
                        <span className="inline-flex size-7 items-center justify-center rounded-sm bg-surface-3 text-fg-muted">
                          <QrIcon aria-hidden="true" className="size-4" />
                        </span>
                        <span className={code.active ? "" : "text-fg-subtle line-through"}>
                          {code.label}
                        </span>
                        {!code.active ? <Badge size="sm">{t("qr.inactive")}</Badge> : null}
                      </button>
                    </TableCell>
                    <TableCell numeric mono className="font-bold">
                      {formatNumber(code.scans, locale)}
                    </TableCell>
                    <TableCell>
                      <span onClick={(event) => event.stopPropagation()}>
                        <Switch
                          checked={code.active}
                          aria-label={t("qr.col.active")}
                          onCheckedChange={(next) => void toggleActive(code, next)}
                        />
                      </span>
                    </TableCell>
                    <TableCell>
                      <span onClick={(event) => event.stopPropagation()}>
                        <Menu>
                          <MenuTrigger asChild>
                            <IconButton
                              size="sm"
                              label={t("common.actions")}
                              icon={<MoreHorizontal aria-hidden="true" className="size-4" />}
                            />
                          </MenuTrigger>
                          <MenuContent align="end">
                            <MenuItem onSelect={() => setRenameTarget(code)}>
                              <Pencil aria-hidden="true" />
                              {t("qr.rename")}
                            </MenuItem>
                            <MenuItem
                              onSelect={() => {
                                void copyText(code.url).then((ok) =>
                                  ok
                                    ? toast.success(t("common.copied"))
                                    : toast.error(t("common.copyFailed")),
                                );
                              }}
                            >
                              <Copy aria-hidden="true" />
                              {t("qr.copyLink")}
                            </MenuItem>
                            <MenuSeparator />
                            <MenuItem tone="danger" onSelect={() => setDeleteTarget(code)}>
                              <Trash2 aria-hidden="true" />
                              {t("common.delete")}
                            </MenuItem>
                          </MenuContent>
                        </Menu>
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="min-[1280px]:sticky min-[1280px]:top-4">
          <StudioPanel
            key={venue.id}
            venue={{ name: venue.name, slug: venue.slug, theme: venue.theme }}
            code={selected}
            codes={codes}
            initialLocale={venue.settings.defaultLocale}
          />
        </div>
      </div>

      <CreateCodeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        venueId={venue.id}
        existingLabels={codes.map((entry) => entry.label)}
        onCreated={() => setSelectedId(null)}
      />
      <RenameCodeDialog
        key={renameTarget?.id ?? "none"}
        open={renameTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
        venueId={venue.id}
        target={renameTarget}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("qr.delete.title", { label: deleteTarget?.label ?? "" })}
        description={t("qr.delete.description")}
        confirmLabel={t("common.delete")}
        tone="danger"
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}
