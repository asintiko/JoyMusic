import { describe, expect, it } from "vitest";
import { layoutText } from "../src/index";

const unbounded = { family: "unbounded", weight: 700, size: 10 } as const;
const manrope = { family: "manrope", weight: 700, size: 10 } as const;

describe("layoutText", () => {
  it("outlines the Uzbek Latin modifier letters", () => {
    const layout = layoutText("Oʻzbekiston Gʻoya Maʼno", unbounded);
    expect(layout.missing).toEqual([]);
    expect(layout.glyphs.every((glyph) => glyph.advance > 0)).toBe(true);
    expect(layout.width).toBeGreaterThan(50);
  });

  it("falls back across families when the primary font lacks a glyph", () => {
    const layout = layoutText("Qoʻshiq maʼlumot", manrope);
    expect(layout.missing).toEqual([]);
    const modifier = layout.glyphs[2]!;
    expect(modifier.commands.length).toBeGreaterThan(0);
  });

  it("outlines Cyrillic text", () => {
    const layout = layoutText("Стол 7 Ёж Ўзбек", unbounded);
    expect(layout.missing).toEqual([]);
    expect(layout.glyphs.filter((glyph) => glyph.commands.length > 0).length).toBe(12);
  });

  it("substitutes Uzbek Cyrillic letters that the bundled subset lacks", () => {
    const layout = layoutText("Қизил Ғишт Ҳовуз", manrope);
    expect(layout.missing).toEqual(expect.arrayContaining(["Қ", "Ғ", "Ҳ"]));
    expect(layout.glyphs.every((glyph) => glyph.advance >= 0)).toBe(true);
    expect(layout.glyphs.filter((glyph) => glyph.commands.length > 0).length).toBe(14);
  });

  it("degrades gracefully for unsupported characters", () => {
    const layout = layoutText("A龍B", unbounded);
    expect(layout.missing).toEqual(["龍"]);
    expect(layout.glyphs).toHaveLength(3);
    expect(Number.isFinite(layout.width)).toBe(true);
  });

  it("scales linearly with the font size", () => {
    const small = layoutText("Scan · Order · Dance", unbounded).width;
    const large = layoutText("Scan · Order · Dance", { ...unbounded, size: 20 }).width;
    expect(large / small).toBeCloseTo(2, 5);
  });
});
