import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Cover, GenerativeCover, coverPalettes, coverPatterns, coverSpec } from "../src";
import { extractPalette } from "../src/lib/palette";

function normalizedMarkup(container: HTMLElement): string {
  return container.innerHTML.replace(/jm-cv-[a-z]+-[^"')#\s]+/g, "id");
}

describe("generative cover", () => {
  it("returns the same spec for the same seed", () => {
    expect(coverSpec("Ozod & Nilufar Oydin kecha")).toEqual(coverSpec("Ozod & Nilufar Oydin kecha"));
  });

  it("normalizes case and surrounding whitespace", () => {
    expect(coverSpec("  The Weeknd  ").pattern).toBe(coverSpec("the weeknd").pattern);
  });

  it("produces different art for different seeds", () => {
    const seeds = Array.from({ length: 60 }, (_, index) => `track ${index}`);
    const signatures = new Set(seeds.map((seed) => JSON.stringify(coverSpec(seed))));
    expect(signatures.size).toBe(seeds.length);
  });

  it("covers every pattern and palette across a modest seed range", () => {
    const patterns = new Set<string>();
    const palettes = new Set<string>();
    for (let index = 0; index < 600; index++) {
      const spec = coverSpec(`seed-${index}`);
      patterns.add(spec.pattern);
      palettes.add(spec.colors.primary);
    }
    expect(patterns.size).toBe(coverPatterns.length);
    expect(palettes.size).toBe(coverPalettes.length);
  });

  it("renders identical markup for identical seeds", () => {
    const first = render(<GenerativeCover seed="Levitating Dua Lipa" />);
    const second = render(<GenerativeCover seed="Levitating Dua Lipa" />);
    expect(normalizedMarkup(first.container)).toBe(normalizedMarkup(second.container));
  });

  it("renders different markup for different seeds", () => {
    const first = render(<GenerativeCover seed="alpha" />);
    const second = render(<GenerativeCover seed="omega" />);
    expect(normalizedMarkup(first.container)).not.toBe(normalizedMarkup(second.container));
  });

  it("falls back to generative art when there is no image", () => {
    const { container } = render(<Cover seed="No image" alt="cover" size={64} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("svg[data-pattern]")).not.toBeNull();
    expect(container.firstElementChild).toHaveAttribute("data-status", "generative");
  });

  it("marks decorative covers as hidden", () => {
    const { container } = render(<Cover seed="x" />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true");
  });
});

describe("palette extraction", () => {
  function fill(color: [number, number, number], count: number): number[] {
    return Array.from({ length: count }, () => [...color, 255]).flat();
  }

  it("prefers the dominant saturated hues", () => {
    const pixels = [...fill([220, 40, 60], 300), ...fill([40, 90, 230], 200), ...fill([20, 20, 20], 500)];
    const colors = extractPalette(pixels);
    expect(colors).not.toBeNull();
    expect(colors).toHaveLength(3);
    expect(colors?.[0]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("returns null for greyscale or transparent images", () => {
    expect(extractPalette(fill([128, 128, 128], 100))).toBeNull();
    expect(extractPalette(Array.from({ length: 100 }, () => [255, 0, 0, 0]).flat())).toBeNull();
  });
});
