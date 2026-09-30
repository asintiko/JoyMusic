import type { CSSProperties } from "react";
import { useArtworkPalette } from "../hooks/use-artwork-palette";
import { coverPalette } from "../lib/cover-art";
import { cx } from "../lib/cx";

export interface AmbientBackgroundProps {
  src?: string | null;
  seed?: string;
  colors?: readonly string[];
  imageBackdrop?: boolean;
  intensity?: number;
  fixed?: boolean;
  grain?: boolean;
  className?: string;
}

export function AmbientBackground({
  src,
  seed,
  colors,
  imageBackdrop = false,
  intensity = 1,
  fixed = false,
  grain = true,
  className,
}: AmbientBackgroundProps) {
  const extracted = useArtworkPalette(colors ? null : src);
  const resolved =
    colors && colors.length > 0
      ? colors
      : (extracted.colors ?? (seed ? coverPalette(seed) : undefined));
  const first = resolved?.[0] ?? "var(--jm-ambient-1)";
  const second = resolved?.[1] ?? resolved?.[0] ?? "var(--jm-ambient-2)";
  const third = resolved?.[2] ?? resolved?.[0] ?? "var(--jm-ambient-3)";
  const blobOpacity = { opacity: 0.75 * intensity } satisfies CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={cx(
        "pointer-events-none inset-0 overflow-hidden bg-canvas",
        fixed ? "fixed" : "absolute",
        grain && "jm-grain",
        className,
      )}
    >
      <span
        className="jm-ambient-blob left-[-18%] top-[-16%] aspect-square w-[78%]"
        data-blob="a"
        style={{ backgroundColor: first, ...blobOpacity }}
      />
      <span
        className="jm-ambient-blob right-[-30%] top-[14%] aspect-square w-[74%]"
        data-blob="b"
        style={{ backgroundColor: second, ...blobOpacity }}
      />
      <span
        className="jm-ambient-blob bottom-[-28%] left-[4%] aspect-square w-[70%]"
        data-blob="c"
        style={{ backgroundColor: third, ...blobOpacity }}
      />
      {imageBackdrop && src ? (
        <img
          src={src}
          alt=""
          className="absolute inset-[-10%] size-[120%] max-w-none scale-125 object-cover opacity-30 blur-3xl saturate-150"
        />
      ) : null}
      <span className="absolute inset-0 bg-[var(--jm-ambient-dim)]" />
      <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--jm-canvas)] to-transparent" />
    </div>
  );
}
