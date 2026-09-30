import { createExporter } from "./export";
import type { Rasterizer } from "./export";

export const resvgRasterizer: Rasterizer = async ({ svg, width, background }) => {
  const { Resvg } = await import("@resvg/resvg-js");
  const renderer = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    background,
    font: { loadSystemFonts: false },
  });
  return new Uint8Array(renderer.render().asPng());
};

const exporter = createExporter(resvgRasterizer);

export const renderPng = exporter.renderPng;
export const renderPdf = exporter.renderPdf;
export const renderBatchPdf = exporter.renderBatchPdf;
export const renderTablesPdf = exporter.renderTablesPdf;

export * from "./index";
