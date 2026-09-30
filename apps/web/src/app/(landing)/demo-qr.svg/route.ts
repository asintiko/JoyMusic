import { landingConfig } from "@/landing/config";
import { renderVenueQr } from "@/lib/qr";

export const dynamic = "force-static";

export function GET(): Response {
  const svg = renderVenueQr(landingConfig.demoUrl, "club");
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
