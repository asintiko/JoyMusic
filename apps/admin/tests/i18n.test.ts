import { locales } from "@joymusic/shared";
import { describe, expect, it } from "vitest";
import { catalog, type MessageKey } from "../src/i18n/messages";
import { translate } from "../src/i18n/translate";

const placeholders = (text: string) =>
  [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe("message catalog", () => {
  const keys = Object.keys(catalog) as MessageKey[];

  it("has a non-empty string for every key and locale", () => {
    for (const key of keys) {
      for (const locale of locales) {
        expect(catalog[key][locale].trim().length, `${key} (${locale})`).toBeGreaterThan(0);
      }
    }
  });

  it("keeps placeholders identical across locales", () => {
    for (const key of keys) {
      const reference = placeholders(catalog[key].en);
      for (const locale of locales) {
        expect(placeholders(catalog[key][locale]), `${key} (${locale})`).toEqual(reference);
      }
    }
  });

  it("uses the Uzbek modifier letter instead of a straight apostrophe inside words", () => {
    for (const key of keys) {
      expect(catalog[key].uz, key).not.toMatch(/[oOgG]'/);
      expect(catalog[key].uz, key).not.toContain("\u2019");
    }
  });
});

describe("translate", () => {
  it("interpolates params", () => {
    expect(translate("en", "shell.venuesCount", { count: 4 })).toBe("Venues: 4");
    expect(translate("ru", "shell.venuesCount", { count: 4 })).toBe("Заведений: 4");
  });
  it("leaves unknown placeholders intact", () => {
    expect(translate("en", "shell.venuesCount")).toBe("Venues: {count}");
  });
});
