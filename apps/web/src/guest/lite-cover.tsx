"use client";

import { memo, useState } from "react";
import { Cover, coverPalette, cx } from "@joymusic/ui";

export interface LiteCoverProps {
  src: string | null;
  seed: string;
  size: number;
  className?: string;
}

function LiteCoverView({ src, seed, size, className }: LiteCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  if (!src || failedSrc === src) {
    return <Cover src={null} seed={seed} size={size} radius="sm" className={className} />;
  }
  const [from = "#3b2a6b", to = "#1a1030"] = coverPalette(seed);
  return (
    <span
      aria-hidden="true"
      className={cx("relative block shrink-0 overflow-hidden rounded-sm", className)}
      style={{
        width: size,
        height: size,
        backgroundImage: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: "inset 0 0 0 1px rgb(255 255 255 / 0.1)",
      }}
    >
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFailedSrc(src)}
        className="absolute inset-0 size-full object-cover"
      />
    </span>
  );
}

export const LiteCover = memo(LiteCoverView);
