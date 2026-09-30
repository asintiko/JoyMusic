import { describe, expect, it } from "vitest";
import {
  areaPathFrom,
  customRange,
  declineSeverity,
  deltaFraction,
  fillHours,
  linearScale,
  monotonePath,
  nearestIndex,
  niceMax,
  niceTicks,
  peakOf,
  presetRange,
  previousRange,
  rangeDays,
  seriesOf,
  sumOf,
  topWithOther,
  trendOf,
} from "../src/lib/chart-data";

describe("ticks", () => {
  it("rounds the maximum to a clean number", () => {
    expect(niceMax(0)).toBe(4);
    expect(niceMax(87)).toBe(100);
    expect(niceMax(118)).toBe(200);
    expect(niceMax(430)).toBe(500);
    expect(niceMax(2300)).toBe(2500);
  });
  it("builds evenly spaced ticks from zero", () => {
    expect(niceTicks(118)).toEqual([0, 50, 100, 150, 200]);
    expect(niceTicks(0)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("hour and peak helpers", () => {
  it("fills missing hours with zero", () => {
    const hours = fillHours([
      { hour: 23, requests: 9 },
      { hour: 1, requests: 3 },
    ]);
    expect(hours).toHaveLength(24);
    expect(hours[23]).toBe(9);
    expect(hours[1]).toBe(3);
    expect(hours[5]).toBe(0);
  });
  it("finds the busiest hour and ignores empty data", () => {
    expect(peakOf([1, 8, 8, 3])).toEqual({ index: 1, value: 8 });
    expect(peakOf([0, 0, 0])).toBeNull();
    expect(peakOf([])).toBeNull();
  });
});

describe("deltas and severity", () => {
  it("computes relative change", () => {
    expect(deltaFraction(150, 100)).toBeCloseTo(0.5);
    expect(deltaFraction(50, 100)).toBeCloseTo(-0.5);
    expect(deltaFraction(0, 0)).toBe(0);
    expect(deltaFraction(5, 0)).toBeNull();
  });
  it("maps deltas to trends", () => {
    expect(trendOf(0.2)).toBe("up");
    expect(trendOf(-0.2)).toBe("down");
    expect(trendOf(0)).toBe("flat");
    expect(trendOf(null)).toBe("flat");
  });
  it("grades the decline rate", () => {
    expect(declineSeverity(0.04)).toBe("ok");
    expect(declineSeverity(0.15)).toBe("warning");
    expect(declineSeverity(0.4)).toBe("critical");
  });
});

describe("ranges", () => {
  const now = Date.UTC(2026, 8, 30, 12, 20);
  it("aligns presets to the next full hour", () => {
    const range = presetRange(7, now);
    expect(range.to).toBe("2026-09-30T13:00:00.000Z");
    expect(rangeDays(range)).toBe(7);
  });
  it("derives the previous window of equal length", () => {
    const range = presetRange(7, now);
    const previous = previousRange(range);
    expect(previous.to).toBe(range.from);
    expect(rangeDays(previous)).toBe(7);
  });
  it("validates custom ranges", () => {
    expect(customRange("2026-09-01", "2026-09-10")).not.toBeNull();
    expect(customRange("2026-09-10", "2026-09-01")).toBeNull();
    expect(customRange("nope", "2026-09-01")).toBeNull();
  });
});

describe("series helpers", () => {
  it("extracts and sums", () => {
    const rows = [
      { requests: 2, guests: 1 },
      { requests: 5, guests: 4 },
    ];
    expect(seriesOf(rows, "requests")).toEqual([2, 5]);
    expect(sumOf(seriesOf(rows, "guests"))).toBe(5);
  });
  it("folds the tail into an other bucket", () => {
    const rows = [
      { label: "a", value: 5 },
      { label: "b", value: 9 },
      { label: "c", value: 1 },
      { label: "d", value: 2 },
    ];
    expect(topWithOther(rows, 3, "Other")).toEqual([
      { label: "b", value: 9 },
      { label: "a", value: 5 },
      { label: "Other", value: 3 },
    ]);
    expect(topWithOther(rows, 10, "Other")).toHaveLength(4);
  });
});

describe("geometry", () => {
  it("scales linearly", () => {
    const scale = linearScale([0, 10], [100, 0]);
    expect(scale(0)).toBe(100);
    expect(scale(10)).toBe(0);
    expect(scale(5)).toBe(50);
  });
  it("snaps to the nearest x", () => {
    expect(nearestIndex(48, [0, 50, 100])).toBe(1);
    expect(nearestIndex(-20, [0, 50, 100])).toBe(0);
  });
  it("produces a monotone path without overshoot", () => {
    const path = monotonePath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 0 },
      { x: 30, y: 10 },
    ]);
    expect(path.startsWith("M0,10C")).toBe(true);
    const numbers = path.replace(/[MC]/g, " ").trim().split(/[ ,]+/).map(Number);
    const ys = numbers.filter((_value, index) => index % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(10);
  });
  it("closes area paths on the baseline", () => {
    const area = areaPathFrom(
      [
        { x: 0, y: 5 },
        { x: 10, y: 3 },
      ],
      20,
    );
    expect(area.endsWith("L10,20L0,20Z")).toBe(true);
    expect(monotonePath([])).toBe("");
  });
});
