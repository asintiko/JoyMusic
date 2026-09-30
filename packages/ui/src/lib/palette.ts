import { toHex } from "./contrast";

export interface PaletteOptions {
  count?: number;
  minSaturation?: number;
}

interface Bucket {
  weight: number;
  r: number;
  g: number;
  b: number;
  hue: number;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, lightness];
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === rn) hue = ((gn - bn) / delta) % 6;
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;
  return [(hue * 60 + 360) % 360, saturation, lightness];
}

function hslToRgb(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const [r1, g1, b1] =
    segment < 1
      ? [chroma, x, 0]
      : segment < 2
        ? [x, chroma, 0]
        : segment < 3
          ? [0, chroma, x]
          : segment < 4
            ? [0, x, chroma]
            : segment < 5
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const offset = lightness - chroma / 2;
  return { r: (r1 + offset) * 255, g: (g1 + offset) * 255, b: (b1 + offset) * 255, a: 1 };
}

function hueDistance(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function normalize(bucket: Bucket): string {
  const r = bucket.r / bucket.weight;
  const g = bucket.g / bucket.weight;
  const b = bucket.b / bucket.weight;
  const [hue, saturation, lightness] = rgbToHsl(r, g, b);
  const boostedSaturation = Math.min(0.92, Math.max(saturation, 0.5));
  const clampedLightness = Math.min(0.62, Math.max(0.4, lightness));
  return toHex(hslToRgb(hue, boostedSaturation, clampedLightness));
}

export function extractPalette(
  pixels: ArrayLike<number>,
  options: PaletteOptions = {},
): string[] | null {
  const { count = 3, minSaturation = 0.18 } = options;
  const buckets = new Map<number, Bucket>();
  let considered = 0;
  for (let offset = 0; offset + 3 < pixels.length; offset += 4) {
    const alpha = pixels[offset + 3] ?? 0;
    if (alpha < 200) continue;
    const r = pixels[offset] ?? 0;
    const g = pixels[offset + 1] ?? 0;
    const b = pixels[offset + 2] ?? 0;
    const [hue, saturation, lightness] = rgbToHsl(r, g, b);
    considered += 1;
    if (saturation < minSaturation || lightness < 0.12 || lightness > 0.92) continue;
    const key = Math.floor(hue / 20);
    const vividness = saturation * (1 - Math.abs(lightness - 0.5));
    const weight = 0.25 + vividness;
    const bucket = buckets.get(key) ?? { weight: 0, r: 0, g: 0, b: 0, hue };
    bucket.weight += weight;
    bucket.r += r * weight;
    bucket.g += g * weight;
    bucket.b += b * weight;
    buckets.set(key, bucket);
  }
  if (considered === 0 || buckets.size === 0) return null;
  const ranked = [...buckets.values()].sort((left, right) => right.weight - left.weight);
  const picked: Bucket[] = [];
  for (const candidate of ranked) {
    if (picked.every((existing) => hueDistance(existing.hue, candidate.hue) >= 36)) {
      picked.push(candidate);
    }
    if (picked.length === count) break;
  }
  for (const candidate of ranked) {
    if (picked.length >= count) break;
    if (!picked.includes(candidate)) picked.push(candidate);
  }
  const colors = picked.map(normalize);
  while (colors.length < count) colors.push(colors[colors.length - 1] ?? "#7a5cff");
  return colors;
}

export function paletteFromImage(image: CanvasImageSource, sample = 40): string[] | null {
  if (typeof document === "undefined") return null;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = sample;
    canvas.height = sample;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, sample, sample);
    return extractPalette(context.getImageData(0, 0, sample, sample).data);
  } catch {
    return null;
  }
}
