import { BatteryFull, Signal, Wifi } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import { locales } from "@joymusic/shared";
import type { Locale } from "@joymusic/shared";
import { Logo, cx } from "../../../src";
import { createRandom } from "../../../src/lib/hash";
import { usePlayground } from "../context";

export interface FrameProps {
  width: number;
  height: number;
  label: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  rounded?: boolean;
}

export function Frame({ width, height, label, children, className, style, rounded }: FrameProps) {
  const { theme } = usePlayground();
  return (
    <div
      id="mockup"
      data-theme={theme}
      data-mockup={label}
      className={cx("pg-frame jm-root", rounded && "rounded-[44px] shadow-4", className)}
      style={{ width, height, ...style }}
    >
      {children}
    </div>
  );
}

export function PhoneStatusBar() {
  return (
    <div className="relative z-20 flex h-[46px] shrink-0 items-end justify-between px-8 pb-1 text-[15px] font-bold tabular-nums text-fg">
      <span>22:47</span>
      <span className="flex items-center gap-1.5">
        <Signal aria-hidden="true" className="size-4" />
        <Wifi aria-hidden="true" className="size-4" />
        <BatteryFull aria-hidden="true" className="size-[22px]" />
      </span>
    </div>
  );
}

export function HomeIndicator() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-2 z-30 flex justify-center">
      <span className="h-[5px] w-[134px] rounded-pill bg-fg opacity-85" />
    </div>
  );
}

export function LangSwitch({ active, size = "sm" }: { active: Locale; size?: "sm" | "md" }) {
  return (
    <div
      role="group"
      aria-label="Language"
      className={cx(
        "jm-glass inline-flex items-center rounded-pill p-0.5",
        size === "md" ? "h-9" : "h-8",
      )}
    >
      {locales.map((code) => (
        <span
          key={code}
          aria-current={code === active || undefined}
          className={cx(
            "inline-flex items-center justify-center rounded-pill px-2.5 text-[11px] font-extrabold uppercase tracking-[0.06em]",
            size === "md" ? "h-8" : "h-7",
            code === active ? "bg-fg text-fg-inverse" : "text-fg-muted",
          )}
        >
          {code}
        </span>
      ))}
    </div>
  );
}

export function QrPlaceholder({
  seed,
  size = 320,
  radius = 18,
}: {
  seed: string;
  size?: number;
  radius?: number;
}) {
  const modules = 29;
  const cells = useMemo(() => {
    const random = createRandom(`qr:${seed}`);
    const grid: boolean[][] = Array.from({ length: modules }, () =>
      Array.from({ length: modules }, () => random() > 0.52),
    );
    const finder = (row: number, column: number) => {
      for (let y = -1; y <= 7; y++) {
        for (let x = -1; x <= 7; x++) {
          const r = row + y;
          const c = column + x;
          if (r < 0 || c < 0 || r >= modules || c >= modules) continue;
          const ring = x === 0 || x === 6 || y === 0 || y === 6;
          const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          const inside = x >= 0 && x <= 6 && y >= 0 && y <= 6;
          const rowRef = grid[r];
          if (rowRef) rowRef[c] = inside && (ring || core);
        }
      }
    };
    finder(0, 0);
    finder(0, modules - 7);
    finder(modules - 7, 0);
    for (let y = 11; y <= 17; y++) {
      for (let x = 11; x <= 17; x++) {
        const rowRef = grid[y];
        if (rowRef) rowRef[x] = false;
      }
    }
    return grid;
  }, [seed]);
  const unit = 100 / (modules + 2);
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        role="img"
        aria-label="QR"
        style={{ borderRadius: radius, background: "#fff" }}
      >
        {cells.map((row, y) =>
          row.map((on, x) =>
            on ? (
              <rect
                key={`${x}-${y}`}
                x={(x + 1) * unit}
                y={(y + 1) * unit}
                width={unit * 0.94}
                height={unit * 0.94}
                rx={unit * 0.24}
                fill="#0A0812"
              />
            ) : null,
          ),
        )}
      </svg>
      <span
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-[#0A0812]"
        style={{ width: size * 0.22, height: size * 0.22, borderRadius: size * 0.055 }}
      >
        <Logo variant="mark" decorative height={size * 0.14} />
      </span>
    </div>
  );
}
