import type { AnalyticsOverview } from "@joymusic/shared";

export interface DateRange {
  from: string;
  to: string;
}

export const rangePresets = [7, 30, 90] as const;
export type RangePreset = (typeof rangePresets)[number];

const hourMs = 3_600_000;
const dayMs = 24 * hourMs;

export function presetRange(days: number, now: number = Date.now()): DateRange {
  const to = Math.ceil(now / hourMs) * hourMs;
  return {
    from: new Date(to - days * dayMs).toISOString(),
    to: new Date(to).toISOString(),
  };
}

export function previousRange(range: DateRange): DateRange {
  const from = new Date(range.from).getTime();
  const to = new Date(range.to).getTime();
  const length = to - from;
  return { from: new Date(from - length).toISOString(), to: new Date(from).toISOString() };
}

export function customRange(fromDate: string, toDate: string): DateRange | null {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T23:59:59`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
  return { from: from.toISOString(), to: to.toISOString() };
}

export function rangeDays(range: DateRange): number {
  return Math.max(
    1,
    Math.round((new Date(range.to).getTime() - new Date(range.from).getTime()) / dayMs),
  );
}

export function fillHours(byHour: AnalyticsOverview["byHour"]): number[] {
  const values = Array.from({ length: 24 }, () => 0);
  for (const entry of byHour) {
    if (entry.hour >= 0 && entry.hour < 24) values[entry.hour] = entry.requests;
  }
  return values;
}

export function peakOf(values: readonly number[]): { index: number; value: number } | null {
  let best = -1;
  let index = -1;
  values.forEach((value, position) => {
    if (value > best) {
      best = value;
      index = position;
    }
  });
  if (index < 0 || best <= 0) return null;
  return { index, value: best };
}

export function niceMax(value: number): number {
  if (value <= 0) return 4;
  const exponent = Math.floor(Math.log10(value));
  const base = 10 ** exponent;
  const fraction = value / base;
  const step =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return step * base;
}

export function niceTicks(maxValue: number, count = 4): number[] {
  const top = niceMax(maxValue);
  const step = top / count;
  return Array.from(
    { length: count + 1 },
    (_unused, index) => Math.round(step * index * 100) / 100,
  );
}

export function deltaFraction(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return (current - previous) / previous;
}

export function trendOf(delta: number | null): "up" | "down" | "flat" {
  if (delta === null || Math.abs(delta) < 0.0005) return "flat";
  return delta > 0 ? "up" : "down";
}

export function pointDelta(current: number, previous: number): number {
  return current - previous;
}

export function declineSeverity(rate: number): "ok" | "warning" | "critical" {
  if (rate >= 0.25) return "critical";
  if (rate >= 0.12) return "warning";
  return "ok";
}

export function seriesOf<K extends string>(
  rows: ReadonlyArray<Record<K, number>>,
  key: K,
): number[] {
  return rows.map((row) => row[key]);
}

export function sumOf(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export interface Point {
  x: number;
  y: number;
}

export function linearScale(domain: readonly [number, number], range: readonly [number, number]) {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  return (value: number) => r0 + ((value - d0) / span) * (r1 - r0);
}

export function monotonePath(points: readonly Point[]): string {
  const count = points.length;
  const first = points[0];
  if (!first) return "";
  if (count === 1) return `M${first.x},${first.y}`;
  const slopes: number[] = [];
  const tangents: number[] = [];
  for (let index = 0; index < count - 1; index += 1) {
    const a = points[index] as Point;
    const b = points[index + 1] as Point;
    slopes.push((b.y - a.y) / (b.x - a.x || 1));
  }
  tangents.push(slopes[0] ?? 0);
  for (let index = 1; index < count - 1; index += 1) {
    const left = slopes[index - 1] ?? 0;
    const right = slopes[index] ?? 0;
    tangents.push(left * right <= 0 ? 0 : (left + right) / 2);
  }
  tangents.push(slopes[count - 2] ?? 0);
  for (let index = 0; index < count - 1; index += 1) {
    const slope = slopes[index] ?? 0;
    if (slope === 0) {
      tangents[index] = 0;
      tangents[index + 1] = 0;
      continue;
    }
    const alpha = (tangents[index] ?? 0) / slope;
    const beta = (tangents[index + 1] ?? 0) / slope;
    const radius = Math.hypot(alpha, beta);
    if (radius > 3) {
      const scale = 3 / radius;
      tangents[index] = scale * alpha * slope;
      tangents[index + 1] = scale * beta * slope;
    }
  }
  let path = `M${first.x},${first.y}`;
  for (let index = 0; index < count - 1; index += 1) {
    const a = points[index] as Point;
    const b = points[index + 1] as Point;
    const dx = (b.x - a.x) / 3;
    path += `C${a.x + dx},${a.y + dx * (tangents[index] ?? 0)},${b.x - dx},${b.y - dx * (tangents[index + 1] ?? 0)},${b.x},${b.y}`;
  }
  return path;
}

export function areaPathFrom(points: readonly Point[], baseline: number): string {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return "";
  return `${monotonePath(points)}L${last.x},${baseline}L${first.x},${baseline}Z`;
}

export function nearestIndex(x: number, xs: readonly number[]): number {
  let best = 0;
  let distance = Number.POSITIVE_INFINITY;
  xs.forEach((candidate, index) => {
    const gap = Math.abs(candidate - x);
    if (gap < distance) {
      distance = gap;
      best = index;
    }
  });
  return best;
}

export function topWithOther<T extends { label: string; value: number }>(
  rows: readonly T[],
  limit: number,
  otherLabel: string,
): Array<{ label: string; value: number }> {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  if (sorted.length <= limit) return sorted.map(({ label, value }) => ({ label, value }));
  const head = sorted.slice(0, limit - 1).map(({ label, value }) => ({ label, value }));
  const rest = sumOf(sorted.slice(limit - 1).map((row) => row.value));
  return [...head, { label: otherLabel, value: rest }];
}
