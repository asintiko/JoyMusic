import { describe, expect, it } from "vitest";
import { encodeQr, encodeQrDetailed } from "../src/index";
import { scanUrl } from "./helpers";

function readEccBits(matrix: boolean[][]): number {
  const at = (row: number, column: number): number => (matrix[row]![column] ? 1 : 0);
  let bits = 0;
  for (let index = 0; index <= 5; index += 1) bits |= at(index, 8) << index;
  bits |= at(7, 8) << 6;
  bits |= at(8, 8) << 7;
  bits |= at(8, 7) << 8;
  for (let index = 9; index < 15; index += 1) bits |= at(8, 14 - index) << index;
  return (bits ^ 0x5412) >> 13;
}

describe("encodeQr", () => {
  it("returns a square boolean matrix", () => {
    const matrix = encodeQr(scanUrl);
    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix.every((row) => row.length === matrix.length)).toBe(true);
    expect(matrix.flat().every((cell) => typeof cell === "boolean")).toBe(true);
  });

  it("defaults to error correction level H and writes it into the format bits", () => {
    const encoded = encodeQrDetailed(scanUrl);
    expect(encoded.ecc).toBe("H");
    expect(readEccBits(encoded.matrix)).toBe(0b10);
  });

  it("honours other levels", () => {
    expect(readEccBits(encodeQr(scanUrl, { ecc: "L" }))).toBe(0b01);
    expect(readEccBits(encodeQr(scanUrl, { ecc: "M" }))).toBe(0b00);
    expect(readEccBits(encodeQr(scanUrl, { ecc: "Q" }))).toBe(0b11);
  });

  it("is deterministic", () => {
    expect(encodeQr(scanUrl)).toEqual(encodeQr(scanUrl));
  });

  it("rejects empty text", () => {
    expect(() => encodeQr("")).toThrow();
  });

  it("encodes Uzbek and Cyrillic payloads", () => {
    expect(encodeQr("https://joymusic.uz/v/oʻzbekiston?t=Стол7").length).toBeGreaterThan(21);
  });
});
