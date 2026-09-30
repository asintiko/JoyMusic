import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatRelative,
  formatShortDay,
  formatDuration,
  formatPlural,
  formatSignedPercent,
  sessionDuration,
  supportedTimeZones,
} from "../src/lib/format";

describe("format helpers", () => {
  it("formats durations with unit labels", () => {
    const units = { hours: "h", minutes: "min" };
    expect(formatDuration(0, units)).toBe("0 min");
    expect(formatDuration(45 * 60_000, units)).toBe("45 min");
    expect(formatDuration(2 * 3_600_000, units)).toBe("2 h");
    expect(formatDuration(2.5 * 3_600_000, units)).toBe("2 h 30 min");
  });
  it("measures session length against now for live sessions", () => {
    expect(sessionDuration("2026-09-30T10:00:00.000Z", "2026-09-30T12:00:00.000Z")).toBe(7_200_000);
    expect(
      sessionDuration("2026-09-30T10:00:00.000Z", null, Date.parse("2026-09-30T10:30:00.000Z")),
    ).toBe(1_800_000);
  });
  it("signs percentages with a real minus", () => {
    expect(formatSignedPercent(0.184, "en")).toBe("+18.4%");
    expect(formatSignedPercent(-0.05, "en")).toBe("−5%");
    expect(formatSignedPercent(0, "en")).toBe("0%");
  });
  it("compacts large numbers only", () => {
    expect(formatCompact(950, "en")).toBe("950");
    expect(formatCompact(12_900, "en")).toBe("12.9k");
  });
  it("picks Russian plural forms", () => {
    const forms = ["заведение", "заведения", "заведений"] as const;
    expect(formatPlural("ru", 1, forms)).toBe("заведение");
    expect(formatPlural("ru", 3, forms)).toBe("заведения");
    expect(formatPlural("ru", 11, forms)).toBe("заведений");
    expect(formatPlural("ru", 21, forms)).toBe("заведение");
  });
  it("always offers Tashkent first-class", () => {
    expect(supportedTimeZones()).toContain("Asia/Tashkent");
  });

  it("formats Uzbek dates, numbers and relative time without depending on ICU data", () => {
    expect(formatDateTime("2026-09-30T13:41:00.000Z", "uz", "Asia/Tashkent")).toBe("30-sen, 18:41");
    expect(formatDate("2026-01-05T10:00:00.000Z", "uz", "UTC")).toBe("5-yan 2026");
    expect(formatShortDay("2026-09-03", "uz")).toBe("3-sen");
    expect(formatNumber(1044, "uz").replace(/\s/g, " ")).toBe("1 044");
    expect(formatPercent(0.154, "uz")).toBe("15,4%");
    expect(formatCompact(12_900, "uz")).toBe("12,9 ming");
    expect(formatCompact(2_400_000, "uz")).toBe("2,4 mln");
    const now = Date.parse("2026-09-30T12:00:00.000Z");
    expect(formatRelative("2026-09-30T06:00:00.000Z", "uz", now)).toBe("6 soat oldin");
    expect(formatRelative("2026-09-27T12:00:00.000Z", "uz", now)).toBe("3 kun oldin");
    expect(formatRelative("2026-09-30T12:00:10.000Z", "uz", now)).toBe("hozirgina");
  });
});
