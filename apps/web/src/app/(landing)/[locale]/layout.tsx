import type { Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { RootShell } from "@/components/root-shell";
import { preloadFonts } from "@/lib/font-preload";
import { localeList } from "@/lib/locale";
import { themeCanvas } from "@/lib/theme";
import { parseLandingLocale } from "@/landing/seo";
import "../../globals.css";
import "@/landing/landing.css";

export const dynamicParams = false;

export function generateStaticParams() {
  return localeList.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: themeCanvas.club,
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default async function LandingLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const locale = parseLandingLocale((await params).locale);
  if (!locale) notFound();
  preloadFonts();
  return (
    <RootShell locale={locale} theme="club">
      {children}
    </RootShell>
  );
}
