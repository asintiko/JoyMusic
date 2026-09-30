import { encode } from "uqr";

export type EccLevel = "L" | "M" | "Q" | "H";
export type QrMatrix = boolean[][];

export interface EncodeOptions {
  ecc?: EccLevel;
  minVersion?: number;
  maskPattern?: number;
}

export interface EncodedQr {
  matrix: QrMatrix;
  size: number;
  version: number;
  ecc: EccLevel;
  maskPattern: number;
}

export function encodeQrDetailed(text: string, options: EncodeOptions = {}): EncodedQr {
  const ecc = options.ecc ?? "H";
  if (text.length === 0) throw new Error("QR text must not be empty");
  const result = encode(text, {
    ecc,
    border: 0,
    minVersion: options.minVersion,
    maskPattern: options.maskPattern,
    boostEcc: false,
  });
  return {
    matrix: result.data.map((row) => row.slice()),
    size: result.size,
    version: result.version,
    ecc,
    maskPattern: result.maskPattern,
  };
}

export function encodeQr(text: string, options: EncodeOptions = {}): QrMatrix {
  return encodeQrDetailed(text, options).matrix;
}

export function assertMatrix(matrix: QrMatrix): number {
  const size = matrix.length;
  const valid = size >= 21 && size <= 177 && matrix.every((row) => row.length === size);
  if (!valid) throw new Error("QR matrix must be square with a size between 21 and 177");
  return size;
}
