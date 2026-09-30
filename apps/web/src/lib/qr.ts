import { buildLogoSvg } from "@joymusic/brand";
import { encodeQr, renderJoyCode } from "@joymusic/qr";
import type { VenueTheme } from "@joymusic/shared";

export function renderVenueQr(url: string, theme: VenueTheme): string {
  const matrix = encodeQr(url);
  return renderJoyCode(matrix, {
    theme,
    frame: false,
    logo: { svg: buildLogoSvg({ variant: "mark", tone: "gradient", idPrefix: "tvqr" }) },
    title: "Joy Code",
  });
}
