const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const signature = [137, 80, 78, 71, 13, 10, 26, 10];

export function setPngDpi(png: Uint8Array, dpi: number): Uint8Array {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const isPng = signature.every((value, index) => png[index] === value);
  if (!isPng) throw new Error("Not a PNG");
  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    if (type === "pHYs") return png;
    if (type === "IDAT") break;
    offset += 12 + length;
  }
  const ihdrEnd = 8 + 12 + view.getUint32(8);
  const perMeter = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const chunkView = new DataView(chunk.buffer);
  chunkView.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4);
  chunkView.setUint32(8, perMeter);
  chunkView.setUint32(12, perMeter);
  chunk[16] = 1;
  chunkView.setUint32(17, crc32(chunk.subarray(4, 17)));
  const result = new Uint8Array(png.length + chunk.length);
  result.set(png.subarray(0, ihdrEnd), 0);
  result.set(chunk, ihdrEnd);
  result.set(png.subarray(ihdrEnd), ihdrEnd + chunk.length);
  return result;
}

export interface PngInfo {
  width: number;
  height: number;
  dpi: number | null;
}

export function readPngInfo(png: Uint8Array): PngInfo {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const width = view.getUint32(16);
  const height = view.getUint32(20);
  let dpi: number | null = null;
  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...png.subarray(offset + 4, offset + 8));
    if (type === "pHYs") dpi = Math.round(view.getUint32(offset + 8) * 0.0254);
    if (type === "IDAT") break;
    offset += 12 + length;
  }
  return { width, height, dpi };
}
