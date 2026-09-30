import { logoMarkSvg } from "@joymusic/brand";
import type { QrCode, VenueTheme } from "@joymusic/shared";
import {
  encodeQr,
  renderTemplate,
  printTemplates,
  type PrintLayout,
  type PrintTemplate,
} from "@joymusic/qr";
import { slugify } from "./slug";

export type StudioLocale = "uz" | "ru" | "en";

export interface StudioOptions {
  template: PrintTemplate;
  locale: StudioLocale;
  headline: string;
  hideHeadline: boolean;
  bleed: boolean;
  cropMarks: boolean;
}

export const defaultStudioOptions: StudioOptions = {
  template: "table-tent",
  locale: "ru",
  headline: "",
  hideHeadline: false,
  bleed: false,
  cropMarks: false,
};

export const studioTemplates = printTemplates;

export interface StudioVenue {
  name: string;
  slug: string;
  theme: VenueTheme;
}

const bleedMm = 3;

export function templateOptionsFor(venue: StudioVenue, options: StudioOptions) {
  const headline = options.hideHeadline ? false : options.headline.trim() || undefined;
  return {
    template: options.template,
    theme: venue.theme,
    locale: options.locale,
    venueName: venue.name,
    logo: { svg: logoMarkSvg },
    headline,
    bleedMm: options.bleed && options.template !== "tv-overlay" ? bleedMm : 0,
    cropMarks: options.cropMarks && options.template !== "tv-overlay",
  } as const;
}

export function buildLayout(
  code: Pick<QrCode, "url" | "label">,
  venue: StudioVenue,
  options: StudioOptions,
): PrintLayout {
  const matrix = encodeQr(code.url);
  return renderTemplate(matrix, { ...templateOptionsFor(venue, options), tableLabel: code.label });
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function exportFileName(
  venue: StudioVenue,
  label: string | null,
  template: PrintTemplate,
  extension: string,
): string {
  const parts = [venue.slug, label ? slugify(label) || "code" : "all-tables", template];
  return `${parts.join("-")}.${extension}`;
}

export function downloadBytes(data: string | Uint8Array, fileName: string, mime: string): void {
  const part: BlobPart = typeof data === "string" ? data : new Uint8Array(data);
  const blob = new Blob([part], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function nextTableNumber(labels: readonly string[]): number {
  let highest = 0;
  for (const label of labels) {
    const match = /(\d+)\s*$/.exec(label);
    if (match?.[1]) highest = Math.max(highest, Number(match[1]));
  }
  return highest + 1;
}

export function bulkLabels(prefix: string, start: number, count: number): string[] {
  const clean = prefix.trim() || "Table";
  return Array.from({ length: count }, (_unused, index) =>
    `${clean} ${start + index}`.slice(0, 40),
  );
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

export function naturalCompare(left: string, right: string): number {
  return collator.compare(left, right);
}
