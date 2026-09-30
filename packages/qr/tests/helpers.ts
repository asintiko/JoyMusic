import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";
import jsQR from "jsqr";
import type { JoyCodeLogo } from "../src/index";

export const scanUrl = "https://joymusic.uz/v/bar-nuri?t=Xk3fA9qLmP2zR7vB";

export function brandLogo(name = "mark.svg"): JoyCodeLogo {
  const path = fileURLToPath(new URL(`../../brand/assets/logo/${name}`, import.meta.url));
  return { svg: readFileSync(path, "utf8") };
}

export const inlineLogo: JoyCodeLogo = {
  svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g"><stop offset="0" stop-color="#7A5CFF"/><stop offset="1" stop-color="#FF4FD8"/></linearGradient></defs><circle cx="50" cy="50" r="40" fill="url(#g)"/></svg>`,
};

export interface Pixels {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export function rasterize(svg: string, width: number, background = "#FFFFFF"): Pixels {
  const rendered = new Resvg(svg, { fitTo: { mode: "width", value: width }, background }).render();
  return {
    data: new Uint8ClampedArray(rendered.pixels),
    width: rendered.width,
    height: rendered.height,
  };
}

export function crop(pixels: Pixels, x: number, y: number, width: number, height: number): Pixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const start = ((y + row) * pixels.width + x) * 4;
    data.set(pixels.data.subarray(start, start + width * 4), row * width * 4);
  }
  return { data, width, height };
}

export function decode(pixels: Pixels): string | null {
  const result = jsQR(pixels.data, pixels.width, pixels.height, {
    inversionAttempts: "dontInvert",
  });
  return result ? result.data : null;
}
