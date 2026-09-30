import type { Locale } from "@joymusic/shared";
import { copyEn } from "./copy-en";
import { copyRu } from "./copy-ru";
import { copyUz } from "./copy-uz";
import type { LandingCopy } from "./types";

export const landingCopy: Record<Locale, LandingCopy> = {
  uz: copyUz,
  ru: copyRu,
  en: copyEn,
};

export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
