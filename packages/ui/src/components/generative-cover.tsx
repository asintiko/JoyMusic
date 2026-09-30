import { useId } from "react";
import type { ReactElement } from "react";
import { coverSpec } from "../lib/cover-art";
import type { CoverSpec } from "../lib/cover-art";
import { cx } from "../lib/cx";
import { initialsOf } from "../lib/format";
import { createRandom, rangeFrom } from "../lib/hash";

export interface GenerativeCoverProps {
  seed: string;
  monogramText?: string;
  showMonogram?: boolean;
  className?: string;
}

interface PatternContext {
  spec: CoverSpec;
  random: () => number;
  ids: { background: string; primary: string; secondary: string; accent: string; blur: string };
}

function Orbs({ spec, random, ids }: PatternContext) {
  const orbs = [
    { id: ids.primary, cx: rangeFrom(random, 18, 42), cy: rangeFrom(random, 20, 46), r: 46 },
    { id: ids.secondary, cx: rangeFrom(random, 58, 86), cy: rangeFrom(random, 50, 84), r: 52 },
    { id: ids.accent, cx: rangeFrom(random, 40, 70), cy: rangeFrom(random, 8, 40), r: 30 },
  ];
  return (
    <>
      {orbs.map((orb) => (
        <circle key={orb.id} cx={orb.cx} cy={orb.cy} r={orb.r} fill={`url(#${orb.id}-radial)`} />
      ))}
      <circle
        cx={orbs[0]?.cx}
        cy={orbs[0]?.cy}
        r={26}
        fill="none"
        stroke={spec.colors.accent}
        strokeOpacity={0.5}
        strokeWidth={0.5}
      />
      <circle
        cx={orbs[1]?.cx}
        cy={orbs[1]?.cy}
        r={38}
        fill="none"
        stroke="#fff"
        strokeOpacity={0.14}
        strokeWidth={0.4}
      />
    </>
  );
}

function Rings({ spec, random, ids }: PatternContext) {
  const centerX = rangeFrom(random, 34, 66);
  const centerY = rangeFrom(random, 34, 66);
  const rings = Array.from({ length: 8 }, (_, index) => index);
  return (
    <>
      {rings.map((index) => (
        <circle
          key={index}
          cx={centerX}
          cy={centerY}
          r={7 + index * 9}
          fill="none"
          stroke={`url(#${ids.primary}-linear)`}
          strokeOpacity={1 - index * 0.09}
          strokeWidth={4.2 - index * 0.4}
        />
      ))}
      <circle cx={centerX} cy={centerY} r={5} fill={spec.colors.accent} />
      <circle cx={centerX} cy={centerY} r={1.6} fill={spec.colors.backgroundFrom} />
    </>
  );
}

function Bars({ spec, random, ids }: PatternContext) {
  const count = 11;
  const phase = rangeFrom(random, 0, 6.28);
  const bars = Array.from({ length: count }, (_, index) => {
    const wave = (Math.sin(phase + index * 0.62) + 1) / 2;
    return { x: 9 + index * 7.6, height: 22 + wave * 44 + random() * 14 };
  });
  return (
    <>
      <circle cx={68} cy={28} r={13} fill={spec.colors.accent} fillOpacity={0.95} />
      {bars.map((bar, index) => (
        <rect
          key={index}
          x={bar.x}
          y={92 - bar.height}
          width={4.6}
          height={bar.height}
          rx={2.3}
          fill={`url(#${ids.primary}-linear)`}
        />
      ))}
    </>
  );
}

function Sunrise({ spec, random, ids }: PatternContext) {
  const cy = rangeFrom(random, 48, 58);
  const stripes = Array.from({ length: 6 }, (_, index) => index);
  return (
    <>
      <circle cx={50} cy={cy} r={27} fill={`url(#${ids.secondary}-linear)`} />
      {stripes.map((index) => (
        <rect
          key={index}
          x={0}
          y={cy + 2 + index * 6.2}
          width={100}
          height={0.8 + index * 0.7}
          fill={spec.colors.backgroundFrom}
        />
      ))}
      <rect x={0} y={cy + 40} width={100} height={30} fill={spec.colors.backgroundFrom} />
      <rect x={0} y={cy + 27} width={100} height={0.6} fill={spec.colors.accent} fillOpacity={0.9} />
    </>
  );
}

function Waves({ spec, random, ids }: PatternContext) {
  const bands = Array.from({ length: 5 }, (_, index) => {
    const baseline = 26 + index * 15;
    const amplitude = rangeFrom(random, 4, 9);
    const shift = rangeFrom(random, 0, 40);
    const points = Array.from({ length: 9 }, (_, step) => {
      const x = step * 12.5;
      const y = baseline + Math.sin((x + shift) / 13) * amplitude;
      return `${x.toFixed(2)} ${y.toFixed(2)}`;
    });
    return { d: `M0 100 L${points.join(" L")} L100 100 Z`, index };
  });
  const fills = [spec.colors.accent, spec.colors.secondary, spec.colors.primary];
  return (
    <>
      {bands.map((band) => (
        <path
          key={band.index}
          d={band.d}
          fill={band.index === 4 ? `url(#${ids.primary}-linear)` : fills[band.index % 3]}
          fillOpacity={band.index === 4 ? 1 : 0.9 - band.index * 0.12}
        />
      ))}
    </>
  );
}

function Halftone({ spec, random }: PatternContext) {
  const focusX = rangeFrom(random, 25, 75);
  const focusY = rangeFrom(random, 25, 75);
  const dots: ReactElement[] = [];
  const grid = 11;
  for (let row = 0; row < grid; row++) {
    for (let column = 0; column < grid; column++) {
      const x = 6 + column * 8.8;
      const y = 6 + row * 8.8;
      const distance = Math.hypot(x - focusX, y - focusY);
      const radius = Math.max(0.5, 4.2 - distance / 15);
      dots.push(
        <circle
          key={`${row}-${column}`}
          cx={x}
          cy={y}
          r={radius}
          fill={distance < 26 ? spec.colors.accent : distance < 48 ? spec.colors.secondary : spec.colors.primary}
        />,
      );
    }
  }
  return <>{dots}</>;
}

function Arcs({ spec, random }: PatternContext) {
  const tiles: ReactElement[] = [];
  const fills = [
    spec.colors.primary,
    spec.colors.secondary,
    spec.colors.accent,
    spec.colors.backgroundTo,
  ];
  const size = 100 / 3;
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      const x = column * size;
      const y = row * size;
      const rotation = Math.floor(random() * 4) * 90;
      const fill = fills[Math.floor(random() * fills.length)];
      tiles.push(
        <g key={`${row}-${column}`} transform={`rotate(${rotation} ${x + size / 2} ${y + size / 2})`}>
          <path
            d={`M${x} ${y + size} A${size} ${size} 0 0 1 ${x + size} ${y} L${x + size} ${y + size} Z`}
            fill={fill}
          />
          <circle cx={x + size * 0.28} cy={y + size * 0.28} r={size * 0.11} fill="#fff" fillOpacity={0.85} />
        </g>,
      );
    }
  }
  return <>{tiles}</>;
}

function Ikat({ spec, random, ids }: PatternContext) {
  const layers = [46, 36, 26, 16, 7];
  const fills = [
    spec.colors.primary,
    spec.colors.backgroundFrom,
    spec.colors.secondary,
    spec.colors.backgroundFrom,
    spec.colors.accent,
  ];
  const corner = rangeFrom(random, 10, 14);
  return (
    <g filter={`url(#${ids.blur})`}>
      {[
        [0, 0],
        [100, 0],
        [0, 100],
        [100, 100],
      ].map(([x, y]) => (
        <path
          key={`${x}-${y}`}
          d={`M${x} ${(y ?? 0) - corner * 2} L${(x ?? 0) + corner * 2} ${y} L${x} ${(y ?? 0) + corner * 2} L${(x ?? 0) - corner * 2} ${y} Z`}
          fill={spec.colors.secondary}
          fillOpacity={0.9}
        />
      ))}
      {layers.map((half, index) => (
        <path
          key={half}
          d={`M50 ${50 - half * 1.3} L${50 + half} 50 L50 ${50 + half * 1.3} L${50 - half} 50 Z`}
          fill={fills[index]}
        />
      ))}
      <rect x={0} y={49} width={100} height={2} fill={spec.colors.accent} fillOpacity={0.55} />
    </g>
  );
}

const patternComponents = {
  orbs: Orbs,
  rings: Rings,
  bars: Bars,
  sunrise: Sunrise,
  waves: Waves,
  halftone: Halftone,
  arcs: Arcs,
  ikat: Ikat,
} as const;

export function GenerativeCover({
  seed,
  monogramText,
  showMonogram = true,
  className,
}: GenerativeCoverProps) {
  const uid = useId().replace(/:/g, "");
  const spec = coverSpec(seed);
  const random = createRandom(`pattern:${spec.seed}`);
  const ids = {
    background: `jm-cv-bg-${uid}`,
    primary: `jm-cv-a-${uid}`,
    secondary: `jm-cv-b-${uid}`,
    accent: `jm-cv-c-${uid}`,
    blur: `jm-cv-blur-${uid}`,
  };
  const Pattern = patternComponents[spec.pattern];
  const glowFor = (id: string, color: string) => (
    <radialGradient id={`${id}-radial`}>
      <stop offset="0" stopColor={color} stopOpacity="0.95" />
      <stop offset="1" stopColor={color} stopOpacity="0" />
    </radialGradient>
  );
  const linearFor = (id: string, from: string, to: string) => (
    <linearGradient id={`${id}-linear`} x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stopColor={from} />
      <stop offset="1" stopColor={to} />
    </linearGradient>
  );
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      data-pattern={spec.pattern}
      className={cx("block size-full", className)}
    >
      <defs>
        <linearGradient
          id={ids.background}
          gradientTransform={`rotate(${spec.angle} 0.5 0.5)`}
        >
          <stop offset="0" stopColor={spec.colors.backgroundTo} />
          <stop offset="1" stopColor={spec.colors.backgroundFrom} />
        </linearGradient>
        {glowFor(ids.primary, spec.colors.primary)}
        {glowFor(ids.secondary, spec.colors.secondary)}
        {glowFor(ids.accent, spec.colors.accent)}
        {linearFor(ids.primary, spec.colors.primary, spec.colors.secondary)}
        {linearFor(ids.secondary, spec.colors.accent, spec.colors.primary)}
        <filter id={ids.blur} x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>
      <rect width="100" height="100" fill={`url(#${ids.background})`} />
      <Pattern spec={spec} random={random} ids={ids} />
      {showMonogram && spec.monogram ? (
        <text
          x="7"
          y="94"
          fontFamily="var(--jm-font-display)"
          fontWeight="700"
          fontSize="13"
          fill="#fff"
          fillOpacity="0.92"
          style={{ letterSpacing: "-0.04em" }}
        >
          {initialsOf(monogramText ?? seed, 1)}
        </text>
      ) : null}
    </svg>
  );
}
