import { notFound } from "next/navigation";
import backdropCafe from "@joymusic/brand/assets/generated/web/backdrop-cafe-2560.webp";
import backdropLounge from "@joymusic/brand/assets/generated/web/backdrop-lounge-2560.webp";
import backdropClub from "@joymusic/brand/assets/generated/web/hero-landing-2560.webp";
import type { VenueTheme } from "@joymusic/shared";
import { resolveLocale } from "@/lib/locale";
import { renderVenueQr } from "@/lib/qr";
import { lookupVenue, requestOrigin } from "@/lib/server";
import { parseTheme } from "@/lib/theme";
import { TvScreen } from "@/tv/tv-screen";

export const dynamic = "force-dynamic";

const backdrops: Record<VenueTheme, string> = {
  club: backdropClub.src,
  lounge: backdropLounge.src,
  cafe: backdropCafe.src,
};

const scaleScript = `document.documentElement.style.setProperty("--tv-scale",String(Math.min(innerWidth/1920,innerHeight/1080)))`;

function single(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

export default async function TvPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const lookup = await lookupVenue(slug);
  if (lookup.status === "not_found") notFound();
  const state = lookup.status === "ok" ? lookup.state : null;
  const venueTheme = state?.venue.theme ?? "club";
  const theme = parseTheme(single(query.theme), venueTheme);
  const locale = resolveLocale({
    override: single(query.locale),
    venueDefault: state?.venue.settings.defaultLocale ?? "uz",
    preferNavigator: false,
  });
  const origin = await requestOrigin();
  const joinUrl = `${origin}/v/${slug}`;
  const qrSvg = renderVenueQr(joinUrl, theme);

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: scaleScript }} />
      <TvScreen
        slug={slug}
        initial={state}
        locale={locale}
        theme={theme}
        qrSvg={qrSvg}
        displayUrl={joinUrl.replace(/^https?:\/\//, "")}
        backdrop={backdrops[theme]}
      />
    </>
  );
}
