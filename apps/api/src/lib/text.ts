const cyrillicToLatin: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ё: "yo",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sh",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ў: "o",
  қ: "q",
  ғ: "g",
  ҳ: "kh",
  ҷ: "j",
  ӣ: "i",
};

const shortKeyLength = 4;

export function normalizeDisplayWord(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function toMatchKey(text: string): string {
  const transliterated = Array.from(normalizeDisplayWord(text).replace(/[ʻʼ'’‘`]/g, ""))
    .map((character) => cyrillicToLatin[character] ?? character)
    .join("");
  return transliterated
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .replace(/kh/g, "x")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/(.)\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function findBlockedWord(text: string, matchKeys: readonly string[]): string | null {
  const key = toMatchKey(text);
  if (key.length === 0) return null;
  const tokens = key.split(" ");
  const squashed = tokens.join("");
  for (const candidate of matchKeys) {
    if (candidate.length === 0) continue;
    if (candidate.length < shortKeyLength) {
      if (tokens.includes(candidate)) return candidate;
      continue;
    }
    if (key.includes(candidate) || squashed.includes(candidate.replace(/ /g, ""))) return candidate;
  }
  return null;
}
