import type { MetadataRoute } from "next";
import { landingConfig } from "@/landing/config";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/v/", "/tv/", "/art"] }],
    sitemap: `${landingConfig.siteOrigin}/sitemap.xml`,
    host: landingConfig.siteOrigin,
  };
}
