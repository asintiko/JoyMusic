import type { ComponentProps } from "react";
import { cx } from "../lib/cx";

export interface SkeletonProps extends Omit<ComponentProps<"div">, "children"> {
  shape?: "rect" | "text" | "circle";
  width?: number | string;
  height?: number | string;
}

export function Skeleton({
  shape = "rect",
  width,
  height,
  className,
  style,
  ...rest
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        "jm-skeleton",
        shape === "circle" ? "rounded-full" : shape === "text" ? "rounded-xs" : "rounded-md",
        className,
      )}
      style={{
        width: width ?? (shape === "circle" ? 40 : "100%"),
        height: height ?? (shape === "text" ? 12 : shape === "circle" ? 40 : 64),
        ...style,
      }}
      {...rest}
    />
  );
}

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cx("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} shape="text" width={index === lines - 1 ? "62%" : "100%"} />
      ))}
    </div>
  );
}
