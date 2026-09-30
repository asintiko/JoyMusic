import { useState } from "react";
import type { ComponentProps } from "react";
import { cx } from "../lib/cx";
import { initialsOf } from "../lib/format";
import { hashString } from "../lib/hash";

export interface AvatarProps extends Omit<ComponentProps<"span">, "children"> {
  name: string;
  src?: string | null;
  size?: number;
  status?: "online" | "away" | "offline";
}

export function avatarGradient(name: string): string {
  const hue = hashString(name) % 360;
  return `linear-gradient(135deg, hsl(${hue} 68% 40%), hsl(${(hue + 42) % 360} 72% 30%))`;
}

const statusClasses = {
  online: "bg-playing",
  away: "bg-next",
  offline: "bg-fg-disabled",
} as const;

export function Avatar({ name, src, size = 36, status, className, style, ...rest }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;
  return (
    <span
      role="img"
      aria-label={name}
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold text-white",
        "shadow-[inset_0_0_0_1px_rgb(255_255_255/0.12)]",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.36),
        backgroundImage: avatarGradient(name),
        ...style,
      }}
      {...rest}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt=""
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{initialsOf(name)}</span>
      )}
      {status ? (
        <span
          className={cx(
            "absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--jm-canvas)]",
            statusClasses[status],
          )}
          style={{ width: Math.max(8, size * 0.24), height: Math.max(8, size * 0.24) }}
        />
      ) : null}
    </span>
  );
}
