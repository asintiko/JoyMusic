import { useId } from "react";
import type { ReactNode } from "react";
import { cx } from "../lib/cx";

export type EmptyIllustration =
  "search" | "queue" | "inbox" | "closed" | "offline" | "qr" | "error";

export interface EmptyStateProps {
  illustration?: EmptyIllustration;
  title: string;
  description?: string;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

interface DrawProps {
  gradient: string;
  glow: string;
}

const surface = "var(--jm-surface-3)";
const surfaceHigh = "var(--jm-surface-4)";
const lineStrong = "var(--jm-line-strong)";

function Vinyl({
  cx: x,
  cy: y,
  r,
  gradient,
}: {
  cx: number;
  cy: number;
  r: number;
  gradient: string;
}) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={surface} stroke={lineStrong} />
      {[0.82, 0.66, 0.5].map((factor) => (
        <circle
          key={factor}
          cx={x}
          cy={y}
          r={r * factor}
          fill="none"
          stroke={lineStrong}
          strokeWidth={1}
        />
      ))}
      <circle cx={x} cy={y} r={r * 0.3} fill={`url(#${gradient})`} />
      <circle cx={x} cy={y} r={r * 0.06} fill="var(--jm-canvas)" />
    </g>
  );
}

function Search({ gradient }: DrawProps) {
  return (
    <>
      <Vinyl cx={62} cy={62} r={40} gradient={gradient} />
      <circle cx={94} cy={72} r={22} fill="var(--jm-canvas)" fillOpacity={0.55} />
      <circle cx={94} cy={72} r={22} fill="none" stroke={`url(#${gradient})`} strokeWidth={6} />
      <path
        d="M110 88 L128 106"
        stroke={`url(#${gradient})`}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <path
        d="M86 72 Q94 62 102 72"
        fill="none"
        stroke="var(--jm-fg)"
        strokeOpacity={0.55}
        strokeWidth={2.4}
        strokeLinecap="round"
      />
    </>
  );
}

function Queue({ gradient }: DrawProps) {
  return (
    <>
      <rect x={30} y={22} width={100} height={26} rx={9} fill={surface} opacity={0.5} />
      <rect x={22} y={40} width={116} height={30} rx={10} fill={surface} opacity={0.8} />
      <rect
        x={14}
        y={60}
        width={132}
        height={40}
        rx={12}
        fill={surfaceHigh}
        stroke={lineStrong}
        strokeDasharray="4 4"
      />
      <rect x={24} y={70} width={20} height={20} rx={6} fill={`url(#${gradient})`} />
      <rect x={52} y={73} width={54} height={5} rx={2.5} fill="var(--jm-fg)" fillOpacity={0.5} />
      <rect x={52} y={83} width={34} height={4} rx={2} fill="var(--jm-fg)" fillOpacity={0.24} />
      {[0, 1, 2].map((index) => (
        <rect
          key={index}
          x={118 + index * 6}
          y={88 - [8, 14, 6][index]!}
          width={3.6}
          height={[8, 14, 6][index]}
          rx={1.8}
          fill="var(--jm-playing)"
        />
      ))}
    </>
  );
}

function Inbox({ gradient }: DrawProps) {
  return (
    <>
      <path
        d="M22 70 L40 34 H120 L138 70 V96 a8 8 0 0 1 -8 8 H30 a8 8 0 0 1 -8 -8 Z"
        fill={surface}
        stroke={lineStrong}
      />
      <path
        d="M22 70 H58 a6 6 0 0 1 6 6 a16 16 0 0 0 32 0 a6 6 0 0 1 6 -6 H138"
        fill="none"
        stroke={lineStrong}
        strokeWidth={1.5}
      />
      <g transform="translate(80 28)">
        <circle r={17} fill={`url(#${gradient})`} />
        <path
          d="M-3 6 V-7 L7 -9 V3"
          fill="none"
          stroke="#fff"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx={-5} cy={6} r={3} fill="#fff" />
        <circle cx={5} cy={3.6} r={3} fill="#fff" />
      </g>
    </>
  );
}

function Closed({ gradient }: DrawProps) {
  return (
    <>
      <rect x={28} y={58} width={104} height={44} rx={12} fill={surface} stroke={lineStrong} />
      <circle cx={58} cy={80} r={14} fill={surfaceHigh} stroke={lineStrong} />
      <circle cx={58} cy={80} r={5} fill="var(--jm-fg)" fillOpacity={0.3} />
      <circle cx={102} cy={80} r={14} fill={surfaceHigh} stroke={lineStrong} />
      <circle cx={102} cy={80} r={5} fill="var(--jm-fg)" fillOpacity={0.3} />
      <path d="M96 20 a20 20 0 1 0 22 28 a16 16 0 0 1 -22 -28 Z" fill={`url(#${gradient})`} />
      <circle cx={52} cy={30} r={2} fill="var(--jm-fg)" fillOpacity={0.7} />
      <circle cx={70} cy={18} r={1.4} fill="var(--jm-fg)" fillOpacity={0.5} />
      <circle cx={40} cy={44} r={1.4} fill="var(--jm-fg)" fillOpacity={0.5} />
    </>
  );
}

function Offline({ gradient }: DrawProps) {
  return (
    <>
      {[46, 32, 18].map((radius, index) => (
        <path
          key={radius}
          d={`M${80 - radius} ${84 - radius * 0.2} A${radius} ${radius} 0 0 1 ${80 + radius} ${84 - radius * 0.2}`}
          fill="none"
          stroke={index === 2 ? `url(#${gradient})` : lineStrong}
          strokeWidth={7}
          strokeLinecap="round"
          opacity={index === 2 ? 1 : 0.55 + index * 0.1}
        />
      ))}
      <circle cx={80} cy={92} r={7} fill={`url(#${gradient})`} />
      <path
        d="M38 26 L122 108"
        stroke="var(--jm-canvas)"
        strokeWidth={13}
        strokeLinecap="round"
        opacity={0.7}
      />
      <path d="M38 26 L122 108" stroke="var(--jm-danger)" strokeWidth={5} strokeLinecap="round" />
    </>
  );
}

function Qr({ gradient }: DrawProps) {
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect
        x={x}
        y={y}
        width={32}
        height={32}
        rx={8}
        fill="none"
        stroke={`url(#${gradient})`}
        strokeWidth={5}
      />
      <rect x={x + 10} y={y + 10} width={12} height={12} rx={3.5} fill={`url(#${gradient})`} />
    </g>
  );
  const dots = [
    [68, 30],
    [68, 42],
    [80, 24],
    [80, 36],
    [64, 62],
    [76, 68],
    [88, 60],
    [100, 68],
    [112, 62],
    [124, 68],
    [64, 88],
    [76, 100],
    [88, 90],
    [100, 102],
    [112, 92],
    [124, 100],
  ];
  return (
    <>
      {finder(24, 22)}
      {finder(104, 22)}
      {finder(24, 82)}
      {dots.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={8}
          height={8}
          rx={2.4}
          fill="var(--jm-fg)"
          fillOpacity={0.35}
        />
      ))}
      <rect
        x={116}
        y={78}
        width={22}
        height={22}
        rx={8}
        fill="none"
        stroke={lineStrong}
        strokeDasharray="3 3"
      />
    </>
  );
}

function ErrorArt({ gradient }: DrawProps) {
  return (
    <>
      <Vinyl cx={80} cy={62} r={44} gradient={gradient} />
      <path
        d="M48 24 L58 36 L50 44 L62 56"
        fill="none"
        stroke="var(--jm-canvas)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g transform="translate(80 62)">
        <path d="M0 -10 V3" stroke="#fff" strokeWidth={4} strokeLinecap="round" />
        <circle cy={10} r={2.4} fill="#fff" />
      </g>
    </>
  );
}

const illustrations = {
  search: Search,
  queue: Queue,
  inbox: Inbox,
  closed: Closed,
  offline: Offline,
  qr: Qr,
  error: ErrorArt,
} as const;

export function EmptyIllustrationArt({
  name,
  className,
}: {
  name: EmptyIllustration;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const gradient = `jm-empty-${uid}`;
  const glow = `jm-empty-glow-${uid}`;
  const Art = illustrations[name];
  return (
    <svg
      viewBox="0 0 160 120"
      aria-hidden="true"
      focusable="false"
      data-illustration={name}
      className={cx("h-auto w-full", className)}
    >
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--jm-brand-from)" />
          <stop offset="1" stopColor="var(--jm-brand-to)" />
        </linearGradient>
        <radialGradient id={glow} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--jm-brand-glow)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--jm-brand-glow)" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="64" rx="76" ry="52" fill={`url(#${glow})`} />
      <Art gradient={gradient} glow={glow} />
    </svg>
  );
}

const sizeClasses = {
  sm: { art: "w-28", gap: "gap-3", pad: "px-4 py-6" },
  md: { art: "w-40", gap: "gap-4", pad: "px-6 py-10" },
  lg: { art: "w-56", gap: "gap-5", pad: "px-8 py-16" },
} as const;

export function EmptyState({
  illustration = "search",
  title,
  description,
  action,
  secondaryAction,
  size = "md",
  className,
}: EmptyStateProps) {
  const style = sizeClasses[size];
  return (
    <div className={cx("flex flex-col items-center text-center", style.gap, style.pad, className)}>
      <EmptyIllustrationArt name={illustration} className={style.art} />
      <div className="max-w-[34ch]">
        <p className="type-title-sm text-fg">{title}</p>
        {description ? <p className="type-body-sm mt-1.5 text-fg-muted">{description}</p> : null}
      </div>
      {action || secondaryAction ? (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
