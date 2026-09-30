import { useNavigate, useParams } from "@tanstack/react-router";
import { ExternalLink, ListMusic, QrCode, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { locales, venueThemes, type AdminVenue, type Locale } from "@joymusic/shared";
import { Button, Input, Select, Skeleton, Switch, cx, useToast } from "@joymusic/ui";
import { CopyButton } from "../../components/copy-button";
import { ConfirmDialog } from "../../components/confirm-dialog";
import { LiveBadge, VenueAvatar } from "../../components/bits";
import { PageHeader, Panel } from "../../components/page";
import { SaveBar } from "../../components/save-bar";
import { ErrorPanel } from "../../components/states";
import { ThemePreview } from "../../components/theme-preview";
import { useFieldErrorText } from "../../components/field-error";
import { useI18n } from "../../i18n";
import { env } from "../../lib/env";
import { errorText } from "../../lib/error-messages";
import { supportedTimeZones } from "../../lib/format";
import { can } from "../../lib/permissions";
import { useSession } from "../../lib/use-session";
import { useVenueScope } from "../../lib/venue-scope";
import {
  diffDraft,
  draftFromVenue,
  hasErrors,
  isDirty,
  settingLimits,
  validateDraft,
  type IntError,
  type VenueDraft,
} from "../../lib/venue-draft";
import { useDeleteVenue, useUpdateVenue, useVenue } from "../../queries";

const localeNames: Record<Locale, string> = { uz: "Oʻzbekcha", ru: "Русский", en: "English" };

function DetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" role="status" aria-busy="true">
      <div className="flex flex-col gap-5">
        <Skeleton height={220} />
        <Skeleton height={320} />
      </div>
      <Skeleton height={380} />
    </div>
  );
}

function VenueSettingsForm({ venue }: { venue: AdminVenue }) {
  const { t } = useI18n();
  const fieldText = useFieldErrorText();
  const toast = useToast();
  const navigate = useNavigate();
  const scope = useVenueScope();
  const role = useSession().role;
  const update = useUpdateVenue(venue.id);
  const remove = useDeleteVenue();
  const [draft, setDraft] = useState<VenueDraft>(() => draftFromVenue(venue));
  const [confirmDelete, setConfirmDelete] = useState(false);
  const zones = useMemo(() => {
    const list = supportedTimeZones();
    return list.includes(venue.timezone) ? list : [venue.timezone, ...list];
  }, [venue.timezone]);

  useEffect(() => {
    setDraft((current) => (isDirty(venue, current) ? current : draftFromVenue(venue)));
  }, [venue]);

  const errors = validateDraft(draft);
  const dirty = isDirty(venue, draft);
  const set = <K extends keyof VenueDraft>(key: K, value: VenueDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const intText = (error: IntError, limits: readonly [number, number]) => {
    if (error === null) return undefined;
    if (error === "required") return t("form.required");
    if (error === "integer") return t("form.integer");
    return t("form.range", { min: limits[0], max: limits[1] });
  };

  const save = async () => {
    if (hasErrors(errors)) return;
    try {
      const saved = await update.mutateAsync(diffDraft(venue, draft));
      setDraft(draftFromVenue(saved));
      toast.success(t("venue.saved"));
    } catch (error) {
      toast.error(t("venue.saveFailed"), errorText(t, error));
    }
  };

  const toggleRequests = async (next: boolean) => {
    try {
      await update.mutateAsync({ settings: { requestsOpen: next } });
      toast.success(next ? t("venue.requestsOpened") : t("venue.requestsClosed"));
    } catch (error) {
      toast.error(t("venue.saveFailed"), errorText(t, error));
    }
  };

  const doDelete = async () => {
    try {
      await remove.mutateAsync(venue.id);
      if (scope.venueId === venue.id) scope.setVenueId(null);
      toast.success(t("venue.deleted", { name: venue.name }));
      void navigate({ to: "/venues" });
    } catch (error) {
      setConfirmDelete(false);
      toast.error(t("venue.deleteFailed"), errorText(t, error));
    }
  };

  const guestUrl = `${env.publicWebUrl}/v/${venue.slug}`;
  const canDelete = can(role, "delete-venue");

  return (
    <>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title={t("venue.requests.title")} subtitle={t("venue.requests.subtitle")}>
            <div className="flex flex-col gap-5">
              <Switch
                size="lg"
                checked={venue.settings.requestsOpen}
                onCheckedChange={(next) => void toggleRequests(next)}
                label={t("venue.requestsOpen")}
                description={t("venue.requestsOpenHint")}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input
                  label={t("venue.maxPerDevice")}
                  type="number"
                  inputMode="numeric"
                  value={draft.maxRequestsPerDevice}
                  onChange={(event) => set("maxRequestsPerDevice", event.target.value)}
                  error={intText(errors.maxRequestsPerDevice, settingLimits.maxRequestsPerDevice)}
                  hint={t("venue.maxPerDeviceHint")}
                />
                <Input
                  label={t("venue.windowMinutes")}
                  type="number"
                  inputMode="numeric"
                  trailing={<span className="text-[12px]">{t("unit.min")}</span>}
                  value={draft.windowMinutes}
                  onChange={(event) => set("windowMinutes", event.target.value)}
                  error={intText(errors.windowMinutes, settingLimits.windowMinutes)}
                  hint={t("venue.windowMinutesHint")}
                />
                <Input
                  label={t("venue.duplicateWindow")}
                  type="number"
                  inputMode="numeric"
                  trailing={<span className="text-[12px]">{t("unit.min")}</span>}
                  value={draft.duplicateWindowMinutes}
                  onChange={(event) => set("duplicateWindowMinutes", event.target.value)}
                  error={intText(
                    errors.duplicateWindowMinutes,
                    settingLimits.duplicateWindowMinutes,
                  )}
                  hint={t("venue.duplicateWindowHint")}
                />
              </div>
              <div className="grid gap-4 border-t border-[var(--jm-line)] pt-5 sm:grid-cols-2">
                <Switch
                  checked={draft.allowFreeText}
                  onCheckedChange={(value) => set("allowFreeText", value)}
                  label={t("venue.allowFreeText")}
                  description={t("venue.allowFreeTextHint")}
                />
                <Switch
                  checked={draft.allowNotes}
                  onCheckedChange={(value) => set("allowNotes", value)}
                  label={t("venue.allowNotes")}
                  description={t("venue.allowNotesHint")}
                />
                <Switch
                  checked={draft.showArtwork}
                  onCheckedChange={(value) => set("showArtwork", value)}
                  label={t("venue.showArtwork")}
                  description={t("venue.showArtworkHint")}
                />
                <Select
                  label={t("venue.defaultLocale")}
                  value={draft.defaultLocale}
                  onChange={(event) => set("defaultLocale", event.target.value as Locale)}
                >
                  {locales.map((code) => (
                    <option key={code} value={code}>
                      {localeNames[code]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </Panel>

          <Panel title={t("venue.general.title")} subtitle={t("venue.general.subtitle")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t("wizard.name")}
                value={draft.name}
                onChange={(event) => set("name", event.target.value)}
                error={fieldText(errors.name, { min: 2, max: 120 })}
              />
              <Input
                label={t("wizard.city")}
                value={draft.city}
                onChange={(event) => set("city", event.target.value)}
              />
              <Input
                label={t("wizard.address")}
                value={draft.address}
                onChange={(event) => set("address", event.target.value)}
              />
              <Select
                label={t("venue.timezone")}
                value={draft.timezone}
                onChange={(event) => set("timezone", event.target.value)}
                hint={t("venue.timezoneHint")}
              >
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </Select>
            </div>
          </Panel>

          <Panel title={t("venue.appearance.title")} subtitle={t("venue.appearance.subtitle")}>
            <div
              role="radiogroup"
              aria-label={t("venue.theme")}
              className="grid gap-3 sm:grid-cols-3"
            >
              {venueThemes.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={draft.theme === option}
                  onClick={() => set("theme", option)}
                  className={cx(
                    "focus-ring flex items-center gap-3 rounded-lg p-3 text-left transition-[box-shadow,background-color]",
                    draft.theme === option
                      ? "bg-brand-soft shadow-[inset_0_0_0_2px_var(--jm-brand)]"
                      : "bg-surface-2 hover:bg-surface-3",
                  )}
                >
                  <span
                    data-theme={option}
                    aria-hidden="true"
                    className="size-10 shrink-0 rounded-md bg-canvas hairline-strong"
                    style={{
                      backgroundImage:
                        "linear-gradient(135deg, var(--jm-brand-from), var(--jm-brand-to))",
                      backgroundSize: "100% 40%",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "bottom",
                    }}
                  />
                  <span>
                    <span className="block text-[13.5px] font-bold">{t(`theme.${option}`)}</span>
                    <span className="block text-[12px] text-fg-muted">
                      {t(`theme.${option}.hint`)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </Panel>

          {canDelete ? (
            <Panel
              title={t("venue.danger.title")}
              subtitle={t("venue.danger.subtitle")}
              className="shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--jm-danger)_30%,transparent)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <p className="type-body-sm max-w-[52ch] text-fg-muted">{t("venue.danger.text")}</p>
                <Button
                  variant="danger"
                  leftIcon={<Trash2 aria-hidden="true" className="size-4" />}
                  onClick={() => setConfirmDelete(true)}
                >
                  {t("venue.delete")}
                </Button>
              </div>
            </Panel>
          ) : null}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-4">
          <Panel title={t("venue.preview")} subtitle={t("venue.previewHint")}>
            <ThemePreview
              theme={draft.theme}
              venueName={draft.name}
              logoUrl={venue.logoUrl}
              coverUrl={venue.coverUrl}
            />
          </Panel>
          <Panel title={t("venue.links")}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 rounded-md bg-surface-2 py-1 pl-3 pr-1 hairline">
                <span className="type-mono min-w-0 flex-1 truncate text-[12px] text-fg-muted">
                  {guestUrl}
                </span>
                <CopyButton value={guestUrl} label={t("venue.copyGuestLink")} />
                <a
                  href={guestUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("venue.openGuest")}
                  className="focus-ring inline-flex size-8 items-center justify-center rounded-sm text-fg-muted hover:bg-surface-3 hover:text-fg"
                >
                  <ExternalLink aria-hidden="true" className="size-4" />
                </a>
              </div>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<QrCode aria-hidden="true" className="size-4" />}
                onClick={() => {
                  scope.setVenueId(venue.id);
                  void navigate({ to: "/qr" });
                }}
              >
                {t("venue.openQr")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<ListMusic aria-hidden="true" className="size-4" />}
                onClick={() => {
                  scope.setVenueId(venue.id);
                  void navigate({ to: "/sessions" });
                }}
              >
                {t("venue.openSessions")}
              </Button>
            </div>
          </Panel>
        </aside>
      </div>
      <SaveBar
        visible={dirty}
        saving={update.isPending}
        disabled={hasErrors(errors)}
        onSave={() => void save()}
        onReset={() => setDraft(draftFromVenue(venue))}
      />
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("venue.delete.title", { name: venue.name })}
        description={t("venue.delete.description")}
        confirmLabel={t("venue.delete")}
        tone="danger"
        requireText={venue.slug}
        loading={remove.isPending}
        onConfirm={() => void doDelete()}
      />
    </>
  );
}

export function VenueDetailPage() {
  const { t } = useI18n();
  const { venueId } = useParams({ strict: false }) as { venueId: string };
  const venue = useVenue(venueId);
  return (
    <>
      <PageHeader
        title={venue.data?.name ?? t("common.loading")}
        description={
          venue.data
            ? `/${venue.data.slug}${venue.data.city ? ` · ${venue.data.city}` : ""}`
            : undefined
        }
        leading={venue.data ? <VenueAvatar venue={venue.data} size={44} /> : undefined}
        actions={venue.data ? <LiveBadge venue={venue.data} /> : undefined}
      />
      {venue.isError ? (
        <ErrorPanel error={venue.error} onRetry={() => void venue.refetch()} />
      ) : venue.data ? (
        <VenueSettingsForm key={venue.data.id} venue={venue.data} />
      ) : (
        <DetailSkeleton />
      )}
    </>
  );
}
