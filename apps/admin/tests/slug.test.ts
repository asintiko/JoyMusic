import { describe, expect, it } from "vitest";
import { alternativeSlug, isValidSlug, slugify } from "../src/lib/slug";

describe("slugify", () => {
  it("lowercases and hyphenates latin names", () => {
    expect(slugify("Nomad Lounge")).toBe("nomad-lounge");
    expect(slugify("  Joy  Demo!! Club ")).toBe("joy-demo-club");
  });
  it("transliterates cyrillic", () => {
    expect(slugify("Ночной клуб")).toBe("nochnoy-klub");
    expect(slugify("Қаҳва Ҳовли")).toBe("qahva-hovli");
  });
  it("drops uzbek apostrophes and diacritics", () => {
    expect(slugify("Oʻzbekiston Café")).toBe("ozbekiston-cafe");
  });
  it("caps the length without trailing hyphen", () => {
    const slug = slugify(`${"a".repeat(47)} bbb`);
    expect(slug.length).toBeLessThanOrEqual(48);
    expect(slug.endsWith("-")).toBe(false);
  });
});

describe("slug validity", () => {
  it("follows the shared contract", () => {
    expect(isValidSlug("joy-demo-club")).toBe(true);
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("Bad_Slug")).toBe(false);
    expect(isValidSlug("double--hyphen")).toBe(false);
  });
  it("suggests alternatives within the length limit", () => {
    expect(alternativeSlug("nomad-lounge", 1)).toBe("nomad-lounge-2");
    expect(alternativeSlug("a".repeat(48), 1).length).toBeLessThanOrEqual(48);
  });
});
