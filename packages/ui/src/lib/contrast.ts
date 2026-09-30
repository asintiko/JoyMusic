export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(value: string): Rgba {
  const input = value.trim().toLowerCase();
  if (input.startsWith("#")) {
    const hex = input.slice(1);
    const full =
      hex.length === 3 || hex.length === 4
        ? Array.from(hex)
            .map((char) => char + char)
            .join("")
        : hex;
    const number = (start: number) => Number.parseInt(full.slice(start, start + 2), 16);
    return {
      r: number(0),
      g: number(2),
      b: number(4),
      a: full.length === 8 ? number(6) / 255 : 1,
    };
  }
  const match = input.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[/,]\s*([\d.]+%?))?\s*\)$/,
  );
  if (!match) throw new Error(`Unsupported color: ${value}`);
  const alphaText = match[4];
  const alpha =
    alphaText === undefined
      ? 1
      : alphaText.endsWith("%")
        ? Number.parseFloat(alphaText) / 100
        : Number.parseFloat(alphaText);
  return {
    r: Number.parseFloat(match[1] ?? "0"),
    g: Number.parseFloat(match[2] ?? "0"),
    b: Number.parseFloat(match[3] ?? "0"),
    a: alpha,
  };
}

export function compositeOver(foreground: Rgba, background: Rgba): Rgba {
  const alpha = foreground.a + background.a * (1 - foreground.a);
  if (alpha === 0) return { r: 0, g: 0, b: 0, a: 0 };
  const mix = (front: number, back: number) =>
    (front * foreground.a + back * background.a * (1 - foreground.a)) / alpha;
  return {
    r: mix(foreground.r, background.r),
    g: mix(foreground.g, background.g),
    b: mix(foreground.b, background.b),
    a: alpha,
  };
}

function channelLuminance(channel: number): number {
  const scaled = channel / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: Rgba): number {
  return (
    0.2126 * channelLuminance(color.r) +
    0.7152 * channelLuminance(color.g) +
    0.0722 * channelLuminance(color.b)
  );
}

export function contrastRatio(foreground: Rgba, background: Rgba): number {
  const resolved = foreground.a < 1 ? compositeOver(foreground, background) : foreground;
  const lighter = Math.max(relativeLuminance(resolved), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(resolved), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

export function toHex(color: Rgba): string {
  const part = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0");
  return `#${part(color.r)}${part(color.g)}${part(color.b)}`;
}
