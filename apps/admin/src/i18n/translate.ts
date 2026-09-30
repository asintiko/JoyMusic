import type { Locale } from "@joymusic/shared";
import { catalog, type MessageKey } from "./messages";

export type Params = Record<string, string | number>;

export function translate(locale: Locale, key: MessageKey, params?: Params): string {
  const entry = catalog[key];
  const text = entry[locale] ?? entry.en;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
}

export type Translate = (key: MessageKey, params?: Params) => string;
