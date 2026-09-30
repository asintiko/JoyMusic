import { describe, expect, it, vi } from "vitest";
import { buildLandingConfig, defaultDownloadUrl } from "@/landing/config";
import { fill, landingCopy } from "@/landing/copy";
import {
  preferredLocaleFromCookie,
  redirectPathForPreference,
  redirectToPreferredLocale,
} from "@/landing/preferred-locale";
import {
  landingJsonLd,
  landingLanguages,
  landingMetadata,
  landingPath,
  landingUrl,
  parseLandingLocale,
} from "@/landing/seo";
import { localeList } from "@/lib/locale";

const origin = "https://joymusic.example";

describe("landing routes", () => {
  it("serves Uzbek at the root and other locales under their code", () => {
    expect(landingPath("uz")).toBe("/");
    expect(landingPath("ru")).toBe("/ru");
    expect(landingPath("en")).toBe("/en");
    expect(landingUrl(origin, "uz")).toBe(`${origin}/`);
    expect(landingUrl(origin, "en")).toBe(`${origin}/en`);
  });

  it("parses only known locale segments", () => {
    expect(parseLandingLocale("ru")).toBe("ru");
    expect(parseLandingLocale("uz")).toBe("uz");
    expect(parseLandingLocale("de")).toBeNull();
    expect(parseLandingLocale(undefined)).toBeNull();
  });

  it("lists hreflang alternates with x-default pointing at Uzbek", () => {
    expect(landingLanguages(origin)).toEqual({
      uz: `${origin}/`,
      ru: `${origin}/ru`,
      en: `${origin}/en`,
      "x-default": `${origin}/`,
    });
  });
});

describe("landing metadata", () => {
  it.each(localeList)(
    "is indexable with canonical, social cards and alternates in %s",
    (locale) => {
      const metadata = landingMetadata(locale, origin);
      expect(metadata.title).toBe(landingCopy[locale].meta.title);
      expect(metadata.description).toBe(landingCopy[locale].meta.description);
      expect(metadata.alternates?.canonical).toBe(landingUrl(origin, locale));
      expect(metadata.alternates?.languages).toEqual(landingLanguages(origin));
      expect(metadata.robots).toEqual({ index: true, follow: true });
      const images = metadata.openGraph?.images;
      expect(JSON.stringify(images)).toContain("/og-image.png");
      expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
    },
  );

  it("emits JSON-LD without invented ratings or prices", () => {
    const text = JSON.stringify(landingJsonLd("en", origin));
    expect(text).toContain("SoftwareApplication");
    expect(text).toContain("Organization");
    expect(text).not.toMatch(/aggregateRating|reviewCount|ratingValue|offers|price/i);
  });
});

describe("landing config", () => {
  it("falls back to placeholders and marks the download as not ready", () => {
    const config = buildLandingConfig({});
    expect(config.adminUrl).toBe("http://localhost:5173");
    expect(config.contactUrl.startsWith("mailto:")).toBe(true);
    expect(config.downloadUrl).toBe(defaultDownloadUrl);
    expect(config.downloadReady).toBe(false);
    expect(config.demoUrl).toBe("http://localhost:3000/v/joy-demo-club");
  });

  it("uses configured values and trims trailing slashes", () => {
    const config = buildLandingConfig({
      NEXT_PUBLIC_ADMIN_URL: "https://admin.example",
      NEXT_PUBLIC_CONTACT_URL: "https://t.me/joymusic",
      NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL: "https://dl.example/joymusic",
      NEXT_PUBLIC_SITE_URL: "https://joymusic.example/",
    });
    expect(config.adminUrl).toBe("https://admin.example");
    expect(config.downloadReady).toBe(true);
    expect(config.downloadUrl).toBe("https://dl.example/joymusic");
    expect(config.demoUrl).toBe("https://joymusic.example/v/joy-demo-club");
  });
});

describe("landing copy", () => {
  const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort().join(",");

  it("keeps structure and placeholders identical across locales", () => {
    const reference = landingCopy.en;
    for (const locale of localeList) {
      const copy = landingCopy[locale];
      expect(copy.how.steps).toHaveLength(reference.how.steps.length);
      expect(copy.faq.items).toHaveLength(reference.faq.items.length);
      expect(copy.venues.features).toHaveLength(reference.venues.features.length);
      expect(copy.djs.auto).toHaveLength(reference.djs.auto.length);
      expect(placeholders(copy.hero.fromTable)).toBe(placeholders(reference.hero.fromTable));
      expect(placeholders(copy.demo.copy.stepOf)).toBe(placeholders(reference.demo.copy.stepOf));
    }
  });

  it("fills placeholders", () => {
    expect(fill("Table {n}", { n: 7 })).toBe("Table 7");
    expect(fill("{a} {missing}", { a: "x" })).toBe("x {missing}");
  });

  it("never mentions prices or currencies", () => {
    const text = JSON.stringify(landingCopy);
    expect(text).not.toMatch(/\$|€|сум|so['ʻ]m\b|UZS|USD/i);
  });

  it("uses the modifier apostrophe in Uzbek", () => {
    expect(JSON.stringify(landingCopy.uz)).not.toMatch(/[a-z]'[a-z]/i);
  });
});

describe("locale preference", () => {
  it("reads the persisted locale cookie", () => {
    expect(preferredLocaleFromCookie("a=1; jm-locale=ru; b=2")).toBe("ru");
    expect(preferredLocaleFromCookie("jm-locale=xx")).toBeNull();
    expect(preferredLocaleFromCookie("")).toBeNull();
  });

  it("only redirects when the preference differs", () => {
    expect(redirectPathForPreference("jm-locale=ru", "uz")).toBe("/ru");
    expect(redirectPathForPreference("jm-locale=uz", "uz")).toBeNull();
    expect(redirectPathForPreference("", "uz")).toBeNull();
  });

  it("redirects the root page through the inline script function", () => {
    const replace = vi.fn();
    redirectToPreferredLocale("x=1; jm-locale=en", { replace, hash: "#faq" });
    expect(replace).toHaveBeenCalledWith("/en#faq");
    replace.mockClear();
    redirectToPreferredLocale("jm-locale=uz", { replace, hash: "" });
    redirectToPreferredLocale("", { replace, hash: "" });
    expect(replace).not.toHaveBeenCalled();
  });
});
