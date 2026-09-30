import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import faviconSvg from "@joymusic/brand/assets/icons/favicon.svg";
import { RootShell } from "@/components/root-shell";
import { resolveRequestLocale } from "@/lib/server";
import { themeCanvas } from "@/lib/theme";
import "../globals.css";

export const viewport: Viewport = {
  themeColor: themeCanvas.club,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Joy Music",
  description: "Request a song from the DJ. Scan, order, dance.",
  icons: { icon: [{ url: faviconSvg.src, type: "image/svg+xml" }] },
};

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const locale = await resolveRequestLocale("uz");
  return (
    <RootShell locale={locale} theme="club">
      {children}
    </RootShell>
  );
}
