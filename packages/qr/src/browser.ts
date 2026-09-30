import { createExporter } from "./export";
import type { Rasterizer } from "./export";

export const canvasRasterizer: Rasterizer = async ({ svg, width, height, background }) => {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("SVG could not be rasterized"));
      image.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);
    }
    context.drawImage(image, 0, 0, width, height);
    const png = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("PNG encoding failed"))),
        "image/png",
      );
    });
    return new Uint8Array(await png.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
};

const exporter = createExporter(canvasRasterizer);

export const renderPng = exporter.renderPng;
export const renderPdf = exporter.renderPdf;
export const renderBatchPdf = exporter.renderBatchPdf;
export const renderTablesPdf = exporter.renderTablesPdf;

export * from "./index";
