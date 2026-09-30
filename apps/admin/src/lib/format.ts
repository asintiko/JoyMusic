import type { Locale } from "@joymusic/shared";

const intlLocales: Record<Locale, string> = { uz: "ru-RU", ru: "ru-RU", en: "en-GB" };

const uzMonths = [
  "yan",
  "fev",
  "mar",
  "apr",
  "may",
  "iyn",
  "iyl",
  "avg",
  "sen",
  "okt",
  "noy",
  "dek",
] as const;

export function intlLocale(locale: Locale): string {
  return intlLocales[locale];
}

export function formatNumber(value: number, locale: Locale): string {
  return new Intl.NumberFormat(intlLocale(locale)).format(value);
}

export function formatCompact(value: number, locale: Locale): string {
  if (Math.abs(value) < 1000) return formatNumber(value, locale);
  if (locale === "uz") {
    const [scaled, unit] =
      Math.abs(value) >= 1_000_000 ? [value / 1_000_000, "mln"] : [value / 1000, "ming"];
    return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(scaled)} ${unit}`;
  }
  return new Intl.NumberFormat(intlLocale(locale), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(fraction: number, locale: Locale, digits = 1): string {
  const text = new Intl.NumberFormat(intlLocale(locale), {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(fraction);
  return locale === "uz" ? text.replace(/\s%/, "%") : text;
}

export function formatSignedPercent(fraction: number, locale: Locale): string {
  const text = formatPercent(Math.abs(fraction), locale);
  if (fraction > 0) return `+${text}`;
  if (fraction < 0) return `−${text}`;
  return text;
}

function zonedParts(date: Date, timeZone?: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(date);
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    day: String(Number(pick("day"))),
    month: Number(pick("month")),
    year: pick("year"),
    time: `${pick("hour")}:${pick("minute")}`,
  };
}

export function formatDate(iso: string, locale: Locale, timeZone?: string): string {
  if (locale === "uz") {
    const parts = zonedParts(new Date(iso), timeZone);
    return `${parts.day}-${uzMonths[parts.month - 1] ?? ""} ${parts.year}`;
  }
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale: Locale, timeZone?: string): string {
  if (locale === "uz") {
    const parts = zonedParts(new Date(iso), timeZone);
    return `${parts.day}-${uzMonths[parts.month - 1] ?? ""}, ${parts.time}`;
  }
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function formatShortDay(isoDate: string, locale: Locale): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  if (locale === "uz") return `${day}-${uzMonths[month - 1] ?? ""}`;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatRelativeUz(seconds: number): string {
  const absolute = Math.abs(seconds);
  if (absolute < 45) return "hozirgina";
  const [amount, unit] =
    absolute < 3600
      ? [Math.round(absolute / 60), "daqiqa"]
      : absolute < 86400
        ? [Math.round(absolute / 3600), "soat"]
        : [Math.round(absolute / 86400), "kun"];
  return seconds < 0 ? `${amount} ${unit} oldin` : `${amount} ${unit}dan keyin`;
}

export function formatRelative(iso: string, locale: Locale, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  if (locale === "uz") return formatRelativeUz(seconds);
  const formatter = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: "auto" });
  const absolute = Math.abs(seconds);
  if (absolute < 60) return formatter.format(seconds, "second");
  if (absolute < 3600) return formatter.format(Math.round(seconds / 60), "minute");
  if (absolute < 86400) return formatter.format(Math.round(seconds / 3600), "hour");
  return formatter.format(Math.round(seconds / 86400), "day");
}

export interface DurationUnits {
  hours: string;
  minutes: string;
}

export function formatDuration(milliseconds: number, units: DurationUnits): string {
  const totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} ${units.minutes}`;
  if (minutes === 0) return `${hours} ${units.hours}`;
  return `${hours} ${units.hours} ${minutes} ${units.minutes}`;
}

export function sessionDuration(
  startedAt: string,
  endedAt: string | null,
  now = Date.now(),
): number {
  const end = endedAt ? new Date(endedAt).getTime() : now;
  return Math.max(0, end - new Date(startedAt).getTime());
}

export function supportedTimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] };
  const zones = intl.supportedValuesOf?.("timeZone") ?? [];
  const list =
    zones.length > 0 ? zones : ["Asia/Tashkent", "Asia/Samarkand", "Europe/Moscow", "UTC"];
  return list.includes("Asia/Tashkent") ? list : ["Asia/Tashkent", ...list];
}

export function formatPlural(
  locale: Locale,
  count: number,
  forms: readonly [string, string, string],
): string {
  if (locale === "ru") {
    const mod10 = count % 10;
    const mod100 = count % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
  }
  return count === 1 ? forms[0] : forms[2];
}
