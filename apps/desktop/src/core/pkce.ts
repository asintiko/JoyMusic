const verifierAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

export function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  globalThis.crypto.getRandomValues(bytes);
  return bytes;
}

export function createCodeVerifier(length = 64): string {
  if (length < 43 || length > 128) throw new RangeError("Code verifier length must be 43 to 128");
  const limit = 256 - (256 % verifierAlphabet.length);
  let result = "";
  while (result.length < length) {
    for (const byte of randomBytes(length * 2)) {
      if (byte >= limit) continue;
      result += verifierAlphabet[byte % verifierAlphabet.length];
      if (result.length === length) break;
    }
  }
  return result;
}

export async function createCodeChallenge(verifier: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return base64Url(new Uint8Array(digest));
}

export function createState(): string {
  return base64Url(randomBytes(24));
}

export function buildAuthorizeUrl(adminUrl: string, state: string, challenge: string): string {
  const url = new URL("/desktop/authorize", adminUrl);
  url.searchParams.set("state", state);
  url.searchParams.set("challenge", challenge);
  return url.toString();
}

export function statesMatch(expected: string, received: string): boolean {
  if (expected.length !== received.length) return false;
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= expected.charCodeAt(index) ^ received.charCodeAt(index);
  }
  return difference === 0;
}
