import type { MetadataRoute } from "next";
import { landingConfig } from "@/landing/config";
import { landingLanguages, landingUrl } from "@/landing/seo";
import { localeList } from "@/lib/locale";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = landingConfig.siteOrigin;
  const languages = landingLanguages(origin);
  return localeList.map((locale) => ({
    url: landingUrl(origin, locale),
    changeFrequency: "monthly",
    priority: locale === "uz" ? 1 : 0.9,
    alternates: { languages },
  }));
}
