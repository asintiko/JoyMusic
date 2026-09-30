import { useMemo } from "react";
import { encodeQr, renderJoyCode } from "@joymusic/qr";
import { logoMarkSvg } from "@joymusic/brand";
import type { ThemeId } from "@joymusic/ui";

export function buildStageQrSvg(url: string, theme: ThemeId): string {
  const matrix = encodeQr(url, { ecc: "H" });
  return renderJoyCode(matrix, {
    theme,
    logo: { svg: logoMarkSvg },
    frame: false,
    title: "Joy Code",
  });
}

export function StageQr({ url, theme, size }: { url: string; theme: ThemeId; size: number }) {
  const svg = useMemo(() => buildStageQrSvg(url, theme), [url, theme]);
  const source = useMemo(() => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, [svg]);
  return (
    <img
      src={source}
      alt="Joy Code"
      width={size}
      height={size}
      data-testid="stage-qr"
      className="rounded-[26px]"
      style={{ width: size, height: size }}
    />
  );
}
