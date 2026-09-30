import { notFound } from "next/navigation";
import { preload } from "react-dom";
import { GuestApp } from "@/guest/guest-app";
import { artworkSrc } from "@/lib/art";
import { lookupVenue, resolveRequestLocale } from "@/lib/server";

export const dynamic = "force-dynamic";

export default async function GuestPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const lookup = await lookupVenue(slug);
  if (lookup.status === "not_found") notFound();
  const state = lookup.status === "ok" ? lookup.state : null;
  const locale = await resolveRequestLocale(state?.venue.settings.defaultLocale ?? "uz");
  const playing = state?.nowPlaying;
  if (playing && state?.venue.settings.showArtwork) {
    const cover = artworkSrc(playing.artworkUrl ?? playing.track?.artworkUrl ?? null, 500);
    if (cover) preload(cover, { as: "image", fetchPriority: "high" });
  }
  return <GuestApp slug={slug} initial={state} initialLocale={locale} />;
}
