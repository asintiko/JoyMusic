import type { Metadata } from "next";
import type { Locale } from "@joymusic/shared";
import { isLocale, localeList } from "@/lib/locale";
import { landingCopy } from "./copy";

export const defaultLandingLocale: Locale = "uz";

const hreflang: Record<Locale, string> = { uz: "uz", ru: "ru", en: "en" };
const openGraphLocale: Record<Locale, string> = { uz: "uz_UZ", ru: "ru_RU", en: "en_US" };

export function landingPath(locale: Locale): string {
  return locale === defaultLandingLocale ? "/" : `/${locale}`;
}

export function landingUrl(origin: string, locale: Locale): string {
  return locale === defaultLandingLocale ? `${origin}/` : `${origin}/${locale}`;
}

export function parseLandingLocale(segment: string | null | undefined): Locale | null {
  return isLocale(segment) ? segment : null;
}

export function landingLanguages(origin: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of localeList) languages[hreflang[locale]] = landingUrl(origin, locale);
  languages["x-default"] = landingUrl(origin, defaultLandingLocale);
  return languages;
}

export function landingMetadata(locale: Locale, origin: string): Metadata {
  const copy = landingCopy[locale];
  const url = landingUrl(origin, locale);
  const image = {
    url: `${origin}/og-image.png`,
    width: 1200,
    height: 630,
    alt: copy.meta.ogAlt,
  };
  return {
    metadataBase: new URL(origin),
    title: copy.meta.title,
    description: copy.meta.description,
    keywords: copy.meta.keywords,
    applicationName: "Joy Music",
    alternates: { canonical: url, languages: landingLanguages(origin) },
    robots: { index: true, follow: true },
    manifest: "/landing.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "48x48" },
      ],
      apple: [{ url: "/apple-touch-icon.png" }],
    },
    openGraph: {
      type: "website",
      siteName: "Joy Music",
      title: copy.meta.title,
      description: copy.meta.description,
      url,
      locale: openGraphLocale[locale],
      alternateLocale: localeList.filter((item) => item !== locale).map((item) => openGraphLocale[item]),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: copy.meta.title,
      description: copy.meta.description,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
}

export function landingJsonLd(locale: Locale, origin: string): Record<string, unknown> {
  const copy = landingCopy[locale];
  const url = landingUrl(origin, locale);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: "Joy Music",
        url: `${origin}/`,
        logo: `${origin}/icon-512.png`,
        areaServed: { "@type": "Country", name: "Uzbekistan" },
      },
      {
        "@type": "WebSite",
        "@id": `${origin}/#website`,
        url: `${origin}/`,
        name: "Joy Music",
        inLanguage: localeList.map((item) => hreflang[item]),
        publisher: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${url}#software`,
        name: "Joy Music",
        description: copy.meta.description,
        url,
        image: `${origin}/og-image.png`,
        inLanguage: hreflang[locale],
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Web, macOS, Windows",
        publisher: { "@id": `${origin}/#organization` },
      },
    ],
  };
}
