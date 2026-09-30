export function normalizeSearch(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/[ʻʼ'’`´‘]/g, "")
    .toLocaleLowerCase()
    .trim();
}

export function fuzzyScore(query: string, target: string): number {
  const needle = normalizeSearch(query);
  const haystack = normalizeSearch(target);
  if (needle === "") return 1;
  if (haystack === needle) return 100;
  if (haystack.startsWith(needle)) return 80 - Math.min(20, haystack.length - needle.length);
  const wordStart = haystack.split(/[\s\-_/·.]+/).findIndex((word) => word.startsWith(needle));
  if (wordStart >= 0) return 60 - wordStart;
  const at = haystack.indexOf(needle);
  if (at >= 0) return 40 - Math.min(20, at);
  let position = 0;
  let gaps = 0;
  for (const char of needle) {
    const found = haystack.indexOf(char, position);
    if (found === -1) return 0;
    gaps += found - position;
    position = found + 1;
  }
  return Math.max(1, 20 - gaps);
}
