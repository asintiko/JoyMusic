import { buildLogoSvg, logoLockupHorizontal } from "@joymusic/brand";

export function LogoInline({
  height,
  idPrefix,
  className,
}: {
  height: number;
  idPrefix: string;
  className?: string;
}) {
  const width = Math.round((logoLockupHorizontal.width / logoLockupHorizontal.height) * height);
  const svg = buildLogoSvg({
    variant: "lockup-horizontal",
    tone: "default",
    idPrefix,
    width,
    height,
  });
  return (
    <span
      className={className}
      style={{ display: "inline-flex", height, width, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
