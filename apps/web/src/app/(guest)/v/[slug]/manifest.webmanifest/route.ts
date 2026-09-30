import icon192 from "@joymusic/brand/assets/pwa/icon-192.png";
import icon512 from "@joymusic/brand/assets/pwa/icon-512.png";
import iconMaskable from "@joymusic/brand/assets/pwa/icon-maskable-512.png";
import { lookupVenue } from "@/lib/server";
import { themeCanvas } from "@/lib/theme";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const lookup = await lookupVenue(slug);
  const venue = lookup.status === "ok" ? lookup.state.venue : null;
  const name = venue?.name ?? "Joy Music";
  const canvas = themeCanvas[venue?.theme ?? "club"];
  const manifest = {
    id: `/v/${slug}`,
    name,
    short_name: name.length > 14 ? name.slice(0, 13).trimEnd() + "…" : name,
    description: name,
    lang: venue?.settings.defaultLocale ?? "uz",
    start_url: `/v/${slug}?source=pwa`,
    scope: `/v/${slug}`,
    display: "standalone",
    orientation: "portrait",
    background_color: canvas,
    theme_color: canvas,
    categories: ["music", "entertainment"],
    icons: [
      { src: icon192.src, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon512.src, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: iconMaskable.src, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    status: lookup.status === "not_found" ? 404 : 200,
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
