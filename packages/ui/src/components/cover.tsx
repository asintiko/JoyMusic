import { useCallback, useState } from "react";
import type { CSSProperties } from "react";
import { cx } from "../lib/cx";
import { GenerativeCover } from "./generative-cover";

export type CoverRadius = "cover" | "sm" | "md" | "full" | "none";

export interface CoverProps {
  src?: string | null;
  seed: string;
  alt?: string;
  size?: number | string;
  radius?: CoverRadius;
  placeholderSrc?: string | null;
  showMonogram?: boolean;
  priority?: boolean;
  shadow?: boolean;
  className?: string;
  style?: CSSProperties;
  onImageError?: () => void;
}

const radiusClasses: Record<CoverRadius, string> = {
  cover: "rounded-cover",
  sm: "rounded-sm",
  md: "rounded-md",
  full: "rounded-full",
  none: "",
};

type ImageStatus = "idle" | "loaded" | "failed";

export function Cover({
  src,
  seed,
  alt,
  size,
  radius = "md",
  placeholderSrc,
  showMonogram = false,
  priority = false,
  shadow = false,
  className,
  style,
  onImageError,
}: CoverProps) {
  const [status, setStatus] = useState<{ src: string | null | undefined; value: ImageStatus }>({
    src,
    value: "idle",
  });
  const current: ImageStatus = status.src === src ? status.value : "idle";
  const showImage = Boolean(src) && current !== "failed";

  const imageRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (node && node.complete && node.naturalWidth > 0) {
        setStatus((previous) =>
          previous.src === src && previous.value === "loaded" ? previous : { src, value: "loaded" },
        );
      }
    },
    [src],
  );

  const dimension = typeof size === "number" ? `${size}px` : size;
  const decorative = alt === undefined || alt === "";

  return (
    <span
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : alt}
      aria-hidden={decorative ? true : undefined}
      data-status={showImage ? current : "generative"}
      className={cx(
        "relative block shrink-0 overflow-hidden bg-surface-3",
        radiusClasses[radius],
        shadow && "shadow-3",
        className,
      )}
      style={{
        aspectRatio: "1 / 1",
        ...(dimension ? { width: dimension, height: dimension } : null),
        ...style,
      }}
    >
      <span
        className={cx(
          "absolute inset-0 transition-opacity duration-500 ease-out",
          current === "loaded" && showImage ? "opacity-0" : "opacity-100",
        )}
      >
        {placeholderSrc && showImage ? (
          <img
            src={placeholderSrc}
            alt=""
            aria-hidden="true"
            className="size-full scale-110 object-cover blur-xl"
          />
        ) : (
          <GenerativeCover seed={seed} showMonogram={showMonogram} />
        )}
      </span>
      {showImage ? (
        <img
          ref={imageRef}
          src={src ?? undefined}
          alt=""
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setStatus({ src, value: "loaded" })}
          onError={() => {
            setStatus({ src, value: "failed" });
            onImageError?.();
          }}
          className={cx(
            "absolute inset-0 size-full object-cover transition-[opacity,filter,transform] duration-700 ease-out",
            current === "loaded" ? "scale-100 opacity-100 blur-0" : "scale-105 opacity-0 blur-lg",
          )}
        />
      ) : null}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.1)]"
      />
    </span>
  );
}
