import opentype from "opentype.js";
import type { Font } from "opentype.js";
import * as data from "./data";

export type FontFamily = "unbounded" | "manrope";
export type FontWeight = 500 | 700;

interface FontSpec {
  family: FontFamily;
  weight: FontWeight;
  chain: string[];
}

const specs: FontSpec[] = [
  { family: "unbounded", weight: 700, chain: [data.unbounded700Latin, data.unbounded700Cyrillic] },
  { family: "manrope", weight: 700, chain: [data.manrope700Latin, data.manrope700Cyrillic] },
  { family: "manrope", weight: 500, chain: [data.manrope500Latin, data.manrope500Cyrillic] },
];

const cache = new Map<string, Font[]>();

function decodeBase64(encoded: string): ArrayBuffer {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

function specFor(family: FontFamily, weight: FontWeight): FontSpec {
  const exact = specs.find((spec) => spec.family === family && spec.weight === weight);
  if (exact) return exact;
  const sameFamily = specs.find((spec) => spec.family === family);
  return sameFamily ?? specs[0]!;
}

export function loadFontChain(family: FontFamily, weight: FontWeight): Font[] {
  const spec = specFor(family, weight);
  const key = `${spec.family}-${spec.weight}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const fonts = spec.chain.map((encoded) => opentype.parse(decodeBase64(encoded)));
  cache.set(key, fonts);
  return fonts;
}

export function loadFallbackChains(family: FontFamily): Font[][] {
  const other: FontFamily = family === "unbounded" ? "manrope" : "unbounded";
  return [loadFontChain(other, 700)];
}
