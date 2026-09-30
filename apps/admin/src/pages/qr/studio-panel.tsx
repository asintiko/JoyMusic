import { Download, FileImage, FileText, FileType, Layers, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import type { QrCode } from "@joymusic/shared";
import { Button, Chip, ChipRow, Input, Select, Skeleton, Switch, cx, useToast } from "@joymusic/ui";
import { Panel } from "../../components/page";
import { useI18n } from "../../i18n";
import {
  buildLayout,
  defaultStudioOptions,
  downloadBytes,
  exportFileName,
  studioTemplates,
  svgDataUrl,
  templateOptionsFor,
  type StudioLocale,
  type StudioOptions,
  type StudioVenue,
} from "../../lib/qr-studio";
import { useDebounced } from "../venues/use-slug-availability";

type Busy = "svg" | "png" | "pdf" | "batch" | null;

export function StudioPanel({
  venue,
  code,
  codes,
  initialLocale,
}: {
  venue: StudioVenue;
  code: QrCode | null;
  codes: readonly QrCode[];
  initialLocale: StudioLocale;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [options, setOptions] = useState<StudioOptions>({
    ...defaultStudioOptions,
    locale: initialLocale,
  });
  const [busy, setBusy] = useState<Busy>(null);
  const headline = useDebounced(options.headline, 250);
  const effective = useMemo(() => ({ ...options, headline }), [options, headline]);
  const set = <K extends keyof StudioOptions>(key: K, value: StudioOptions[K]) =>
    setOptions((current) => ({ ...current, [key]: value }));

  const layout = useMemo(() => {
    if (!code) return null;
    try {
      return buildLayout(code, venue, effective);
    } catch {
      return null;
    }
  }, [code, venue, effective]);

  const activeCodes = codes.filter((entry) => entry.active);

  const run = async (kind: Exclude<Busy, null>, task: () => Promise<void>) => {
    setBusy(kind);
    try {
      await task();
    } catch {
      toast.error(t("qr.exportFailed"));
    } finally {
      setBusy(null);
    }
  };

  const exportSvg = () =>
    run("svg", async () => {
      if (!layout || !code) return;
      downloadBytes(
        layout.svg,
        exportFileName(venue, code.label, options.template, "svg"),
        "image/svg+xml",
      );
    });

  const exportPng = () =>
    run("png", async () => {
      if (!layout || !code) return;
      const qr = await import("@joymusic/qr/browser");
      const bytes = await qr.renderPng(layout, { dpi: 300 });
      downloadBytes(bytes, exportFileName(venue, code.label, options.template, "png"), "image/png");
    });

  const exportPdf = () =>
    run("pdf", async () => {
      if (!layout || !code) return;
      const qr = await import("@joymusic/qr/browser");
      const bytes = await qr.renderPdf(layout, {
        dpi: 300,
        title: `${venue.name} · ${code.label}`,
        author: "Joy Music",
      });
      downloadBytes(
        bytes,
        exportFileName(venue, code.label, options.template, "pdf"),
        "application/pdf",
      );
    });

  const exportBatch = () =>
    run("batch", async () => {
      if (activeCodes.length === 0) return;
      const qr = await import("@joymusic/qr/browser");
      const bytes = await qr.renderTablesPdf(
        {
          ...templateOptionsFor(venue, effective),
          tables: activeCodes.map((entry) => ({ url: entry.url, tableLabel: entry.label })),
        },
        { dpi: 300, title: `${venue.name} · ${t("qr.allTables")}`, author: "Joy Music" },
      );
      downloadBytes(bytes, exportFileName(venue, null, options.template, "pdf"), "application/pdf");
      toast.success(t("qr.batchDone", { count: activeCodes.length }));
    });

  const isTv = options.template === "tv-overlay";
  const aspect = layout ? layout.width / layout.height : 0.7;

  return (
    <Panel
      title={t("qr.studio")}
      subtitle={code ? t("qr.studioFor", { label: code.label }) : t("qr.studioIdle")}
      className="h-fit"
      bodyClassName="flex flex-col gap-4"
    >
      <div
        className={cx(
          "relative flex items-center justify-center overflow-hidden rounded-lg p-4",
          isTv
            ? "bg-[repeating-conic-gradient(var(--jm-surface-2)_0_25%,var(--jm-surface-3)_0_50%)] [background-size:16px_16px]"
            : "bg-surface-2",
        )}
        style={{ minHeight: 300 }}
      >
        {code && layout ? (
          <img
            data-testid="qr-preview"
            alt={t("qr.previewAlt", { label: code.label })}
            src={svgDataUrl(layout.svg)}
            className="block max-h-[420px] w-full rounded-md object-contain shadow-[var(--jm-shadow-3)]"
            style={{
              aspectRatio: String(aspect),
              maxWidth: aspect < 1 ? `${Math.round(420 * aspect)}px` : "100%",
            }}
          />
        ) : code ? (
          <Skeleton height={280} width="60%" />
        ) : (
          <p className="type-body-sm max-w-[26ch] text-center text-fg-subtle">
            {t("qr.studioIdle")}
          </p>
        )}
      </div>

      {layout && layout.missingGlyphs.length > 0 ? (
        <p className="flex items-start gap-2 rounded-md bg-next-soft px-3 py-2 text-[12px] font-semibold text-next-fg">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t("qr.missingGlyphs", { glyphs: layout.missingGlyphs.join(" ") })}
        </p>
      ) : null}

      <div>
        <p className="type-label mb-2 text-fg-muted">{t("qr.template")}</p>
        <ChipRow bleed={false} className="flex-wrap">
          {studioTemplates.map((template) => (
            <Chip
              key={template}
              size="sm"
              selected={options.template === template}
              onClick={() => set("template", template)}
            >
              {t(`qr.template.${template}`)}
            </Chip>
          ))}
        </ChipRow>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label={t("qr.language")}
          value={options.locale}
          onChange={(event) => set("locale", event.target.value as StudioLocale)}
        >
          <option value="uz">Oʻzbekcha</option>
          <option value="ru">Русский</option>
          <option value="en">English</option>
        </Select>
        <Input
          label={t("qr.headline")}
          value={options.headline}
          disabled={options.hideHeadline}
          onChange={(event) => set("headline", event.target.value)}
          placeholder={t("qr.headlineDefault")}
          maxLength={40}
        />
      </div>
      <div className="flex flex-col gap-3">
        <Switch
          checked={!options.hideHeadline}
          onCheckedChange={(value) => set("hideHeadline", !value)}
          label={t("qr.showHeadline")}
        />
        {isTv ? null : (
          <>
            <Switch
              checked={options.bleed}
              onCheckedChange={(value) => set("bleed", value)}
              label={t("qr.bleed")}
              description={t("qr.bleedHint")}
            />
            <Switch
              checked={options.cropMarks}
              onCheckedChange={(value) => set("cropMarks", value)}
              label={t("qr.cropMarks")}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 border-t border-[var(--jm-line)] pt-4">
        <Button
          variant="secondary"
          size="sm"
          disabled={!layout}
          loading={busy === "svg"}
          leftIcon={<FileType aria-hidden="true" className="size-4" />}
          onClick={() => void exportSvg()}
        >
          SVG
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!layout}
          loading={busy === "png"}
          leftIcon={<FileImage aria-hidden="true" className="size-4" />}
          onClick={() => void exportPng()}
        >
          PNG
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!layout}
          loading={busy === "pdf"}
          leftIcon={<FileText aria-hidden="true" className="size-4" />}
          onClick={() => void exportPdf()}
        >
          PDF
        </Button>
      </div>
      <Button
        variant="primary"
        disabled={activeCodes.length === 0}
        loading={busy === "batch"}
        leftIcon={<Layers aria-hidden="true" className="size-4" />}
        onClick={() => void exportBatch()}
      >
        {t("qr.downloadAll", { count: activeCodes.length })}
      </Button>
      <p className="flex items-start gap-2 text-[12px] text-fg-subtle">
        <Download aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
        {t("qr.printTip")}
      </p>
    </Panel>
  );
}
