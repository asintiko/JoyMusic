import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { landingConfig } from "@/landing/config";
import { LandingPage } from "@/landing/landing-page";
import { landingJsonLd, landingMetadata, parseLandingLocale } from "@/landing/seo";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = parseLandingLocale((await params).locale);
  if (!locale) notFound();
  return landingMetadata(locale, landingConfig.siteOrigin);
}

export default async function LocaleLandingPage({ params }: PageProps) {
  const locale = parseLandingLocale((await params).locale);
  if (!locale) notFound();
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(landingJsonLd(locale, landingConfig.siteOrigin)).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />
      <LandingPage locale={locale} />
    </>
  );
}
