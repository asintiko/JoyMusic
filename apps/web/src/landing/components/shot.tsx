import type { CSSProperties } from "react";

export interface ShotProps {
  name: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  priority?: boolean;
  sizes?: string;
  style?: CSSProperties;
}

export function Shot({ name, alt, width, height, className, priority, sizes, style }: ShotProps) {
  return (
    <img
      src={`/landing/${name}.webp`}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "low" : "auto"}
      decoding="async"
      draggable={false}
      className={className}
      style={style}
    />
  );
}
