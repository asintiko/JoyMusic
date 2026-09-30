import { PDFDocument } from "pdf-lib";
import { encodeQr } from "./matrix";
import type { EncodeOptions } from "./matrix";
import { setPngDpi } from "./png";
import { pixelSize, renderTemplate } from "./templates";
import type { PrintLayout, TemplateOptions } from "./templates";

export const PNG_DPI = 300;
export const POINTS_PER_MM = 72 / 25.4;

export interface RasterRequest {
  svg: string;
  width: number;
  height: number;
  background?: string;
}

export type Rasterizer = (request: RasterRequest) => Promise<Uint8Array>;

export interface PngOptions {
  dpi?: number;
  background?: string;
}

export interface PdfOptions extends PngOptions {
  title?: string;
  author?: string;
  createdAt?: Date;
}

export interface PdfPageInput {
  png: Uint8Array;
  widthMm: number;
  heightMm: number;
}

export interface TableEntry {
  url: string;
  tableLabel?: string;
  tableNumber?: string | number;
}

export type TablesInput = Omit<TemplateOptions, "tableLabel" | "tableNumber"> & {
  tables: TableEntry[];
  encode?: EncodeOptions;
};

export function buildTableLayouts(input: TablesInput): PrintLayout[] {
  const { tables, encode, ...common } = input;
  return tables.map((table) =>
    renderTemplate(encodeQr(table.url, { ecc: "H", ...encode }), {
      ...common,
      tableLabel: table.tableLabel,
      tableNumber: table.tableNumber,
    }),
  );
}

export async function createPdfFromPngs(
  pages: PdfPageInput[],
  options: Pick<PdfOptions, "title" | "author" | "createdAt"> = {},
): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const createdAt = options.createdAt ?? new Date();
  document.setTitle(options.title ?? "Joy Code");
  document.setAuthor(options.author ?? "Joy Music");
  document.setCreator("@joymusic/qr");
  document.setProducer("@joymusic/qr");
  document.setCreationDate(createdAt);
  document.setModificationDate(createdAt);
  for (const page of pages) {
    const image = await document.embedPng(page.png);
    const width = page.widthMm * POINTS_PER_MM;
    const height = page.heightMm * POINTS_PER_MM;
    const target = document.addPage([width, height]);
    target.drawImage(image, { x: 0, y: 0, width, height });
  }
  return document.save();
}

export interface Exporter {
  renderPng(layout: PrintLayout, options?: PngOptions): Promise<Uint8Array>;
  renderPdf(layout: PrintLayout, options?: PdfOptions): Promise<Uint8Array>;
  renderBatchPdf(layouts: PrintLayout[], options?: PdfOptions): Promise<Uint8Array>;
  renderTablesPdf(input: TablesInput, options?: PdfOptions): Promise<Uint8Array>;
}

export function createExporter(rasterize: Rasterizer): Exporter {
  async function renderPng(layout: PrintLayout, options: PngOptions = {}): Promise<Uint8Array> {
    const dpi = options.dpi ?? PNG_DPI;
    const size = pixelSize(layout, dpi);
    const png = await rasterize({
      svg: layout.svg,
      width: size.width,
      height: size.height,
      background: options.background,
    });
    return setPngDpi(png, layout.unit === "px" ? 96 : dpi);
  }

  async function renderBatchPdf(
    layouts: PrintLayout[],
    options: PdfOptions = {},
  ): Promise<Uint8Array> {
    const pages: PdfPageInput[] = [];
    for (const layout of layouts) {
      const background = options.background ?? (layout.unit === "px" ? "#FFFFFF" : undefined);
      const png = await renderPng(layout, { dpi: options.dpi, background });
      pages.push({ png, widthMm: layout.widthMm, heightMm: layout.heightMm });
    }
    return createPdfFromPngs(pages, options);
  }

  return {
    renderPng,
    renderBatchPdf,
    renderPdf: (layout, options) => renderBatchPdf([layout], options),
    renderTablesPdf: (input, options) => renderBatchPdf(buildTableLayouts(input), options),
  };
}
