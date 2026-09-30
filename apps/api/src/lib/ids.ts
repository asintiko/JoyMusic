import { createHash, randomBytes } from "node:crypto";

const idAlphabet = "0123456789abcdefghjkmnpqrstvwxyz";
const urlSafeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

export function newId(prefix: string): string {
  let suffix = "";
  for (const byte of randomBytes(20)) suffix += idAlphabet.charAt(byte & 31);
  return `${prefix}_${suffix}`;
}

export function randomUrlToken(length: number): string {
  let token = "";
  for (const byte of randomBytes(length)) token += urlSafeAlphabet.charAt(byte & 63);
  return token;
}

export function randomSecret(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256Base64Url(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}
