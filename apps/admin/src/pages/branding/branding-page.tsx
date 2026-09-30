import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { venueThemes, type AdminVenue, type VenueTheme } from "@joymusic/shared";
import { Input, cx, useToast } from "@joymusic/ui";
import { useFieldErrorText } from "../../components/field-error";
import { NoVenue } from "../../components/no-venue";
import { PageHeader, Panel } from "../../components/page";
import { SaveBar } from "../../components/save-bar";
import { TableSkeleton } from "../../components/states";
import { ThemePreview } from "../../components/theme-preview";
import { VenueSelect } from "../../components/venue-select";
import { useI18n } from "../../i18n";
import { errorText } from "../../lib/error-messages";
import { validateText, validateUrl } from "../../lib/validators";
import { useVenueScope } from "../../lib/venue-scope";
import { useUpdateVenue } from "../../queries";

interface BrandingDraft {
  name: string;
  city: string;
  logoUrl: string;
  coverUrl: string;
  theme: VenueTheme;
}

function fromVenue(venue: AdminVenue): BrandingDraft {
  return {
    name: venue.name,
    city: venue.city ?? "",
    logoUrl: venue.logoUrl ?? "",
    coverUrl: venue.coverUrl ?? "",
    theme: venue.theme,
  };
}

function nullable(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function BrandingForm({ venue }: { venue: AdminVenue }) {
  const { t } = useI18n();
  const toast = useToast();
  const fieldText = useFieldErrorText();
  const update = useUpdateVenue(venue.id);
  const [draft, setDraft] = useState<BrandingDraft>(() => fromVenue(venue));

  useEffect(() => {
    setDraft(fromVenue(venue));
  }, [venue.id]);

  const set = <K extends keyof BrandingDraft>(key: K, value: BrandingDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));
  const nameError = validateText(draft.name, 2, 120);
  const logoError = !validateUrl(draft.logoUrl);
  const coverError = !validateUrl(draft.coverUrl);
  const invalid = Boolean(nameError) || logoError || coverError;
  const dirty =
    draft.name.trim() !== venue.name ||
    nullable(draft.city) !== venue.city ||
    nullable(draft.logoUrl) !== venue.logoUrl ||
    nullable(draft.coverUrl) !== venue.coverUrl ||
    draft.theme !== venue.theme;

  const save = async () => {
    if (invalid) return;
    try {
      const saved = await update.mutateAsync({
        name: draft.name.trim(),
        city: nullable(draft.city),
        logoUrl: nullable(draft.logoUrl),
        coverUrl: nullable(draft.coverUrl),
        theme: draft.theme,
      });
      setDraft(fromVenue(saved));
      toast.success(t("branding.saved"));
    } catch (error) {
      toast.error(t("venue.saveFailed"), errorText(t, error));
    }
  };

  return (
    <>
      <div className="grid items-start gap-5 min-[1100px]:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title={t("branding.identity.title")} subtitle={t("branding.identity.subtitle")}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t("wizard.name")}
                value={draft.name}
                onChange={(event) => set("name", event.target.value)}
                error={fieldText(nameError, { min: 2, max: 120 })}
              />
              <Input
                label={t("wizard.city")}
                value={draft.city}
                onChange={(event) => set("city", event.target.value)}
              />
              <Input
                label={t("branding.logoUrl")}
                type="url"
                inputMode="url"
                placeholder="https://"
                value={draft.logoUrl}
                onChange={(event) => set("logoUrl", event.target.value)}
                error={logoError ? t("form.url") : undefined}
                hint={t("branding.logoHint")}
              />
              <Input
                label={t("branding.coverUrl")}
                type="url"
                inputMode="url"
                placeholder="https://"
                value={draft.coverUrl}
                onChange={(event) => set("coverUrl", event.target.value)}
                error={coverError ? t("form.url") : undefined}
                hint={t("branding.coverHint")}
              />
            </div>
          </Panel>
          <Panel title={t("branding.theme.title")} subtitle={t("branding.theme.subtitle")}>
            <div
              role="radiogroup"
              aria-label={t("venue.theme")}
              className="grid gap-4 md:grid-cols-3"
            >
              {venueThemes.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={draft.theme === option}
                  onClick={() => set("theme", option)}
                  className={cx(
                    "focus-ring flex flex-col gap-3 rounded-xl p-2.5 text-left transition-[box-shadow,background-color]",
                    draft.theme === option
                      ? "bg-brand-soft shadow-[inset_0_0_0_2px_var(--jm-brand)]"
                      : "bg-surface-2 hover:bg-surface-3",
                  )}
                >
                  <ThemePreview
                    theme={option}
                    venueName={draft.name}
                    logoUrl={draft.logoUrl || null}
                    coverUrl={draft.coverUrl || null}
                    compact
                  />
                  <span className="flex items-center justify-between px-1.5 pb-1">
                    <span>
                      <span className="block text-[14px] font-bold">{t(`theme.${option}`)}</span>
                      <span className="block text-[12px] text-fg-muted">
                        {t(`theme.${option}.hint`)}
                      </span>
                    </span>
                    {draft.theme === option ? (
                      <CheckCircle2 aria-hidden="true" className="size-5 text-brand" />
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] text-fg-subtle">{t("branding.themeNote")}</p>
          </Panel>
        </div>
        <div className="min-[1100px]:sticky min-[1100px]:top-4">
          <Panel title={t("venue.preview")} subtitle={t("venue.previewHint")}>
            <ThemePreview
              theme={draft.theme}
              venueName={draft.name}
              logoUrl={draft.logoUrl || null}
              coverUrl={draft.coverUrl || null}
            />
          </Panel>
        </div>
      </div>
      <SaveBar
        visible={dirty}
        saving={update.isPending}
        disabled={invalid}
        onSave={() => void save()}
        onReset={() => setDraft(fromVenue(venue))}
      />
    </>
  );
}

export function BrandingPage() {
  const { t } = useI18n();
  const scope = useVenueScope();
  const venue = scope.effective;
  const header = (
    <PageHeader
      title={t("nav.branding")}
      description={t("branding.subtitle")}
      actions={<VenueSelect />}
    />
  );
  if (scope.loading) {
    return (
      <>
        {header}
        <TableSkeleton rows={4} columns={3} />
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
      <BrandingForm key={venue.id} venue={venue} />
    </>
  );
}
