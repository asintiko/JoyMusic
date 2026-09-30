import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import apple from "@joymusic/brand/assets/icons/apple-touch-icon.png";
import faviconSvg from "@joymusic/brand/assets/icons/favicon.svg";
import { RootShell } from "@/components/root-shell";
import { ServiceWorkerRegister } from "@/components/sw-register";
import { resolveRequestLocale, lookupVenue } from "@/lib/server";
import { themeCanvas } from "@/lib/theme";
import "../../../globals.css";

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateViewport({ params }: Pick<LayoutProps, "params">): Promise<Viewport> {
  const { slug } = await params;
  const lookup = await lookupVenue(slug);
  const theme = lookup.status === "ok" ? lookup.state.venue.theme : "club";
  return {
    themeColor: themeCanvas[theme],
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    colorScheme: theme === "cafe" ? "light" : "dark",
  };
}

export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const lookup = await lookupVenue(slug);
  const name = lookup.status === "ok" ? lookup.state.venue.name : "Joy Music";
  return {
    title: `${name} · Joy Music`,
    description: name,
    manifest: `/v/${slug}/manifest.webmanifest`,
    robots: { index: false, follow: false },
    icons: {
      icon: [{ url: faviconSvg.src, type: "image/svg+xml" }],
      apple: [{ url: apple.src }],
    },
    appleWebApp: { capable: true, title: name, statusBarStyle: "black-translucent" },
    formatDetection: { telephone: false },
  };
}

export default async function GuestLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const lookup = await lookupVenue(slug);
  const venue = lookup.status === "ok" ? lookup.state.venue : null;
  const locale = await resolveRequestLocale(venue?.settings.defaultLocale ?? "uz");
  return (
    <RootShell locale={locale} theme={venue?.theme ?? "club"}>
      {children}
      <ServiceWorkerRegister />
    </RootShell>
  );
}
