const allowedHosts = [/(^|\.)dzcdn\.net$/i, /(^|\.)mzstatic\.com$/i, /(^|\.)deezer\.com$/i];

export function isAllowedArtworkHost(hostname: string): boolean {
  return allowedHosts.some((pattern) => pattern.test(hostname));
}

export function resizeArtwork(url: string, size: number): string {
  const deezer = url.replace(/\/\d{2,4}x\d{2,4}(-000000-\d+-\d+-\d+\.\w+)$/, `/${size}x${size}$1`);
  if (deezer !== url) return deezer;
  return url.replace(/\/\d{2,4}x\d{2,4}(bb)?\.(jpg|png|webp)$/, `/${size}x${size}bb.$2`);
}

export function artworkSrc(url: string | null | undefined, size: number): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!isAllowedArtworkHost(parsed.hostname)) return url;
  const resized = resizeArtwork(url, size);
  return `/art?u=${encodeURIComponent(resized)}`;
}
