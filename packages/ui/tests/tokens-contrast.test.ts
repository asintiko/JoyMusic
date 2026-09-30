import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { compositeOver, contrastRatio, parseColor } from "../src/lib/contrast";

const css = readFileSync(resolve(process.cwd(), "src/tokens.css"), "utf8");

function themeBlock(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  const body = css.slice(open + 1, close);
  const tokens: Record<string, string> = {};
  for (const match of body.matchAll(/(--jm-[a-z0-9-]+):\s*([^;]+);/g)) {
    const name = match[1];
    const value = match[2];
    if (name && value) tokens[name] = value.trim();
  }
  return tokens;
}

const themes = {
  club: themeBlock(':root,\n[data-theme="club"]'),
  lounge: themeBlock('[data-theme="lounge"]'),
  cafe: themeBlock('[data-theme="cafe"]'),
} as const;

function ratio(tokens: Record<string, string>, foreground: string, background: string): number {
  const back = parseColor(tokens[background] ?? "#000");
  const front = parseColor(tokens[foreground] ?? "#fff");
  return contrastRatio(front, back);
}

function softRatio(tokens: Record<string, string>, text: string, soft: string, base: string) {
  const baseColor = parseColor(tokens[base] ?? "#000");
  const surface = compositeOver(parseColor(tokens[soft] ?? "#000"), baseColor);
  return contrastRatio(parseColor(tokens[text] ?? "#fff"), surface);
}

describe.each(Object.entries(themes))("theme %s WCAG AA", (_name, tokens) => {
  const surfaces = ["--jm-canvas", "--jm-surface-1", "--jm-surface-2", "--jm-surface-3"];

  it.each(surfaces)("body text on %s is at least 7:1", (surface) => {
    expect(ratio(tokens, "--jm-fg", surface)).toBeGreaterThanOrEqual(7);
  });

  it.each(surfaces)("muted text on %s is at least 4.5:1", (surface) => {
    expect(ratio(tokens, "--jm-fg-muted", surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(surfaces)("subtle text on %s is at least 4.5:1", (surface) => {
    expect(ratio(tokens, "--jm-fg-subtle", surface)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["--jm-brand", "--jm-playing-fg", "--jm-next-fg", "--jm-danger-fg", "--jm-success-fg", "--jm-info-fg"])(
    "%s text on canvas and surface 2 is at least 4.5:1",
    (token) => {
      expect(ratio(tokens, token, "--jm-canvas")).toBeGreaterThanOrEqual(4.5);
      expect(ratio(tokens, token, "--jm-surface-2")).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("status soft badges keep 4.5:1 on surface 1", () => {
    for (const status of ["playing", "next", "danger", "success", "info"]) {
      expect(
        softRatio(tokens, `--jm-${status}-fg`, `--jm-${status}-soft`, "--jm-surface-1"),
      ).toBeGreaterThanOrEqual(4.5);
    }
    expect(softRatio(tokens, "--jm-brand", "--jm-brand-soft", "--jm-surface-1")).toBeGreaterThanOrEqual(4.5);
  });

  it("text on solid signal fills is at least 4.5:1", () => {
    for (const status of ["playing", "next", "danger", "success", "info"]) {
      expect(ratio(tokens, `--jm-on-${status}`, `--jm-${status}`)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("brand gradient stops carry on-brand text at 4.5:1", () => {
    expect(ratio(tokens, "--jm-on-brand", "--jm-brand-strong-from")).toBeGreaterThanOrEqual(4.5);
    expect(ratio(tokens, "--jm-on-brand", "--jm-brand-strong-to")).toBeGreaterThanOrEqual(4.5);
  });

  it("focus ring is at least 3:1 on canvas and surface 3", () => {
    expect(ratio(tokens, "--jm-focus", "--jm-canvas")).toBeGreaterThanOrEqual(3);
    expect(ratio(tokens, "--jm-focus", "--jm-surface-3")).toBeGreaterThanOrEqual(3);
  });
});
