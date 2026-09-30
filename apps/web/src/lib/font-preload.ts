import { preload } from "react-dom";

const fonts = [
  new URL(
    "../../node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2",
    import.meta.url,
  ),
  new URL(
    "../../node_modules/@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2",
    import.meta.url,
  ),
];

export function preloadFonts(): void {
  for (const font of fonts) {
    preload(font.pathname, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  }
}
