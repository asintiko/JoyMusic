import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import faviconSvg from "@joymusic/brand/assets/icons/favicon.svg";
import { RootShell } from "@/components/root-shell";
import { lookupVenue } from "@/lib/server";
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
    colorScheme: theme === "cafe" ? "light" : "dark",
  };
}

export async function generateMetadata({ params }: Pick<LayoutProps, "params">): Promise<Metadata> {
  const { slug } = await params;
  const lookup = await lookupVenue(slug);
  const name = lookup.status === "ok" ? lookup.state.venue.name : "Joy Music";
  return {
    title: `${name} · TV · Joy Music`,
    robots: { index: false, follow: false },
    icons: { icon: [{ url: faviconSvg.src, type: "image/svg+xml" }] },
  };
}

export default async function TvLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const lookup = await lookupVenue(slug);
  const theme = lookup.status === "ok" ? lookup.state.venue.theme : "club";
  return (
    <RootShell locale="uz" theme={theme} bodyClassName="overflow-hidden">
      {children}
    </RootShell>
  );
}
