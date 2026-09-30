import {
  logoColors,
  logoLockupHorizontal,
  logoLockupStacked,
  logoMarkGradient,
  logoMarkPaths,
  logoMarkViewBox,
  logoWordmark,
} from "@joymusic/brand";
import { useId } from "react";
import type { ComponentProps } from "react";
import { cx } from "../lib/cx";

export type LogoVariant = "mark" | "wordmark" | "horizontal" | "stacked";
export type LogoTone = "brand" | "theme" | "current" | "white" | "black";

export interface LogoProps extends Omit<ComponentProps<"svg">, "children" | "viewBox"> {
  variant?: LogoVariant;
  tone?: LogoTone;
  height?: number;
  title?: string;
  decorative?: boolean;
}

interface Geometry {
  viewBox: string;
  width: number;
  height: number;
  wordmarkTransform?: string;
  showMark: boolean;
  showWordmark: boolean;
}

const geometry: Record<LogoVariant, Geometry> = {
  mark: {
    viewBox: logoMarkViewBox,
    width: 128,
    height: 128,
    showMark: true,
    showWordmark: false,
  },
  wordmark: {
    viewBox: logoWordmark.viewBox,
    width: logoWordmark.width,
    height: logoWordmark.height,
    showMark: false,
    showWordmark: true,
  },
  horizontal: {
    viewBox: logoLockupHorizontal.viewBox,
    width: logoLockupHorizontal.width,
    height: logoLockupHorizontal.height,
    wordmarkTransform: logoLockupHorizontal.wordmarkTransform,
    showMark: true,
    showWordmark: true,
  },
  stacked: {
    viewBox: logoLockupStacked.viewBox,
    width: logoLockupStacked.width,
    height: logoLockupStacked.height,
    wordmarkTransform: logoLockupStacked.wordmarkTransform,
    showMark: true,
    showWordmark: true,
  },
};

export const logoMinHeights: Record<LogoVariant, number> = {
  mark: 16,
  wordmark: 14,
  horizontal: 24,
  stacked: 56,
};

export function Logo({
  variant = "horizontal",
  tone = "brand",
  height = 32,
  title = "Joy Music",
  decorative = false,
  className,
  ...rest
}: LogoProps) {
  const uid = useId().replace(/:/g, "");
  const markId = `jm-logo-mark-${uid}`;
  const shape = geometry[variant];
  const width = (shape.width / shape.height) * height;

  const gradientMark = tone === "brand" || tone === "theme";
  const markFill = gradientMark
    ? `url(#${markId})`
    : tone === "white"
      ? logoColors.white
      : tone === "black"
        ? logoColors.black
        : "currentColor";
  const wordFill =
    tone === "brand" || tone === "theme"
      ? "var(--jm-fg)"
      : tone === "white"
        ? logoColors.white
        : tone === "black"
          ? logoColors.black
          : "currentColor";
  const accentFill =
    tone === "brand" ? logoColors.magenta : tone === "theme" ? "var(--jm-brand-to)" : wordFill;

  const gradientStops =
    tone === "theme"
      ? { from: "var(--jm-brand-from)", to: "var(--jm-brand-to)" }
      : { from: logoMarkGradient.from, to: logoMarkGradient.to };

  const wordmark = (
    <>
      <path fill={wordFill} d={logoWordmark.path} />
      <path fill={accentFill} d={logoWordmark.accentPath} />
    </>
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={shape.viewBox}
      width={width}
      height={height}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      data-variant={variant}
      className={cx("shrink-0", className)}
      {...rest}
    >
      {decorative ? null : <title>{title}</title>}
      {gradientMark && shape.showMark ? (
        <defs>
          <linearGradient
            id={markId}
            gradientUnits="userSpaceOnUse"
            x1={logoMarkGradient.x1}
            y1={logoMarkGradient.y1}
            x2={logoMarkGradient.x2}
            y2={logoMarkGradient.y2}
          >
            <stop offset="0" stopColor={gradientStops.from} />
            <stop offset="1" stopColor={gradientStops.to} />
          </linearGradient>
        </defs>
      ) : null}
      {shape.showMark ? (
        <path fill={markFill} d={`${logoMarkPaths.body}${logoMarkPaths.module}`} />
      ) : null}
      {shape.showWordmark ? (
        shape.wordmarkTransform ? (
          <g transform={shape.wordmarkTransform}>{wordmark}</g>
        ) : (
          wordmark
        )
      ) : null}
    </svg>
  );
}
