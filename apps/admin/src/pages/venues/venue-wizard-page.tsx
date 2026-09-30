import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { venueThemes, type VenueTheme } from "@joymusic/shared";
import { Button, Input, Select, cx, useToast } from "@joymusic/ui";
import { PageHeader, Panel } from "../../components/page";
import { ThemePreview } from "../../components/theme-preview";
import { useFieldErrorText } from "../../components/field-error";
import { useI18n } from "../../i18n";
import { describeError } from "../../lib/api-errors";
import { errorText } from "../../lib/error-messages";
import { supportedTimeZones } from "../../lib/format";
import { alternativeSlug, isValidSlug, slugify } from "../../lib/slug";
import { validateText } from "../../lib/validators";
import { useCreateVenue } from "../../queries";
import { useSlugAvailability } from "./use-slug-availability";

const steps = ["basics", "look", "review"] as const;
type Step = (typeof steps)[number];

function SlugStatusLine({
  status,
  slug,
}: {
  status: ReturnType<typeof useSlugAvailability>;
  slug: string;
}) {
  const { t } = useI18n();
  if (status === "idle") return <span className="text-fg-subtle">{t("wizard.slugHint")}</span>;
  if (status === "invalid") {
    return (
      <span className="inline-flex items-center gap-1.5 text-danger-fg">
        <XCircle aria-hidden="true" className="size-3.5" />
        {slug.length < 3 ? t("wizard.slugShort") : t("wizard.slugInvalid")}
      </span>
    );
  }
  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1.5 text-fg-subtle">
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
        {t("wizard.slugChecking")}
      </span>
    );
  }
  if (status === "available") {
    return (
      <span className="inline-flex items-center gap-1.5 text-success-fg">
        <CheckCircle2 aria-hidden="true" className="size-3.5" />
        {t("wizard.slugAvailable")}
      </span>
    );
  }
  if (status === "taken") {
    return (
      <span className="inline-flex items-center gap-1.5 text-danger-fg">
        <XCircle aria-hidden="true" className="size-3.5" />
        {t("wizard.slugTaken")}
      </span>
    );
  }
  return <span className="text-fg-subtle">{t("wizard.slugUnknown")}</span>;
}

export function VenueWizardPage() {
  const { t } = useI18n();
  const fieldText = useFieldErrorText();
  const toast = useToast();
  const navigate = useNavigate();
  const create = useCreateVenue();
  const [step, setStep] = useState<Step>("basics");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [city, setCity] = useState("Toshkent");
  const [address, setAddress] = useState("");
  const [theme, setTheme] = useState<VenueTheme>("club");
  const [timezone, setTimezone] = useState("Asia/Tashkent");
  const [touched, setTouched] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const status = useSlugAvailability(slug);
  const zones = supportedTimeZones();

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  const nameError = touched ? validateText(name, 2, 120) : null;
  const slugBlocked = status === "invalid" || status === "taken" || conflict === slug;
  const stepIndex = steps.indexOf(step);

  const goNext = (event?: FormEvent) => {
    event?.preventDefault();
    if (step === "basics") {
      setTouched(true);
      if (validateText(name, 2, 120) || !isValidSlug(slug) || slugBlocked || status === "checking")
        return;
      setStep("look");
    } else if (step === "look") {
      setStep("review");
    }
  };

  const submit = async () => {
    setFormError(null);
    try {
      const venue = await create.mutateAsync({
        name: name.trim(),
        slug,
        city: city.trim() || null,
        address: address.trim() || null,
        theme,
        timezone,
      });
      toast.success(t("wizard.created", { name: venue.name }));
      void navigate({ to: "/venues/$venueId", params: { venueId: venue.id } });
    } catch (error) {
      if (describeError(error).kind === "slug_taken") {
        setConflict(slug);
        setStep("basics");
      } else {
        setFormError(errorText(t, error));
      }
    }
  };

  const suggestion = conflict ? alternativeSlug(conflict, 1) : null;

  return (
    <>
      <PageHeader title={t("venues.new")} description={t("wizard.subtitle")} />
      <ol className="mb-6 flex items-center gap-3" aria-label={t("wizard.steps")}>
        {steps.map((entry, index) => {
          const done = index < stepIndex;
          const current = index === stepIndex;
          return (
            <li
              key={entry}
              className="flex items-center gap-3"
              aria-current={current ? "step" : undefined}
            >
              <span
                className={cx(
                  "type-mono inline-flex size-7 items-center justify-center rounded-full text-[12px] font-bold transition-colors",
                  done
                    ? "bg-success-soft text-success-fg"
                    : current
                      ? "bg-brand-gradient-strong text-on-brand"
                      : "bg-surface-3 text-fg-subtle",
                )}
              >
                {done ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}
              </span>
              <span className={cx("text-[13px] font-bold", current ? "text-fg" : "text-fg-subtle")}>
                {t(`wizard.step.${entry}`)}
              </span>
              {index < steps.length - 1 ? (
                <span aria-hidden="true" className="h-px w-8 bg-[var(--jm-line-strong)]" />
              ) : null}
            </li>
          );
        })}
      </ol>

      {step === "basics" ? (
        <form
          onSubmit={goNext}
          noValidate
          className="grid items-start gap-5 min-[1000px]:grid-cols-[minmax(0,640px)_300px]"
        >
          <div>
            <Panel title={t("wizard.basics.title")} subtitle={t("wizard.basics.subtitle")}>
              <div className="flex flex-col gap-4">
                <Input
                  label={t("wizard.name")}
                  name="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nomad Lounge"
                  error={fieldText(nameError, { min: 2, max: 120 })}
                  autoFocus
                  required
                />
                <div className="flex flex-col gap-1.5">
                  <Input
                    label={t("wizard.slug")}
                    name="slug"
                    value={slug}
                    leading={<span className="type-mono text-[13px]">/v/</span>}
                    onChange={(event) => {
                      setSlugEdited(true);
                      setConflict(null);
                      setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                    }}
                    invalid={status === "invalid" || status === "taken" || conflict === slug}
                    aria-describedby="slug-status"
                    spellCheck={false}
                    autoComplete="off"
                    required
                  />
                  <p
                    id="slug-status"
                    aria-live="polite"
                    className="min-h-4 text-[12px] font-semibold"
                  >
                    {conflict === slug ? (
                      <span className="text-danger-fg">{t("err.slug_taken")}</span>
                    ) : (
                      <SlugStatusLine status={status} slug={slug} />
                    )}
                  </p>
                  {suggestion && conflict === slug ? (
                    <button
                      type="button"
                      className="focus-ring w-fit rounded-xs text-[12.5px] font-bold text-brand hover:underline"
                      onClick={() => {
                        setSlug(suggestion);
                        setConflict(null);
                        setSlugEdited(true);
                      }}
                    >
                      {t("wizard.trySuggestion", { slug: suggestion })}
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={t("wizard.city")}
                    name="city"
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                  />
                  <Input
                    label={t("wizard.address")}
                    name="address"
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                  />
                </div>
              </div>
            </Panel>
            <div className="mt-5 flex justify-end">
              <Button
                type="submit"
                rightIcon={<ArrowRight aria-hidden="true" className="size-4" />}
              >
                {t("common.next")}
              </Button>
            </div>
          </div>
          <ThemePreview theme={theme} venueName={name} className="max-[999px]:hidden" />
        </form>
      ) : null}

      {step === "look" ? (
        <div>
          <Panel title={t("wizard.look.title")} subtitle={t("wizard.look.subtitle")}>
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
                  aria-checked={theme === option}
                  onClick={() => setTheme(option)}
                  className={cx(
                    "focus-ring group flex flex-col gap-3 rounded-xl p-2.5 text-left transition-[box-shadow,background-color]",
                    theme === option
                      ? "bg-brand-soft shadow-[inset_0_0_0_2px_var(--jm-brand)]"
                      : "bg-surface-2 hover:bg-surface-3",
                  )}
                >
                  <ThemePreview theme={option} venueName={name} compact />
                  <span className="flex items-center justify-between px-1.5 pb-1">
                    <span>
                      <span className="block text-[14px] font-bold">{t(`theme.${option}`)}</span>
                      <span className="block text-[12px] text-fg-muted">
                        {t(`theme.${option}.hint`)}
                      </span>
                    </span>
                    {theme === option ? (
                      <CheckCircle2 aria-hidden="true" className="size-5 text-brand" />
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-5 max-w-[360px]">
              <Select
                label={t("venue.timezone")}
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                hint={t("wizard.timezoneHint")}
              >
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </Select>
            </div>
          </Panel>
          <div className="mt-5 flex justify-between">
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft aria-hidden="true" className="size-4" />}
              onClick={() => setStep("basics")}
            >
              {t("common.back")}
            </Button>
            <Button
              rightIcon={<ArrowRight aria-hidden="true" className="size-4" />}
              onClick={() => goNext()}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Panel title={t("wizard.review.title")} subtitle={t("wizard.review.subtitle")}>
            <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-3 text-[14px]">
              <dt className="text-fg-subtle">{t("wizard.name")}</dt>
              <dd className="font-bold">{name}</dd>
              <dt className="text-fg-subtle">{t("wizard.slug")}</dt>
              <dd className="type-mono">/v/{slug}</dd>
              <dt className="text-fg-subtle">{t("wizard.city")}</dt>
              <dd>{city || "–"}</dd>
              <dt className="text-fg-subtle">{t("wizard.address")}</dt>
              <dd>{address || "–"}</dd>
              <dt className="text-fg-subtle">{t("venue.theme")}</dt>
              <dd>{t(`theme.${theme}`)}</dd>
              <dt className="text-fg-subtle">{t("venue.timezone")}</dt>
              <dd className="type-mono">{timezone}</dd>
            </dl>
            {formError ? (
              <p
                role="alert"
                className="mt-4 rounded-md bg-danger-soft px-3 py-2.5 text-[13px] font-semibold text-danger-fg"
              >
                {formError}
              </p>
            ) : null}
          </Panel>
          <ThemePreview theme={theme} venueName={name} className="self-start" />
          <div className="flex justify-between lg:col-span-2">
            <Button
              variant="ghost"
              leftIcon={<ArrowLeft aria-hidden="true" className="size-4" />}
              onClick={() => setStep("look")}
            >
              {t("common.back")}
            </Button>
            <Button loading={create.isPending} onClick={() => void submit()}>
              {t("wizard.create")}
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
