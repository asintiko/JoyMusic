const latinDigraphs: [string, string][] = [
  ["shch", "щ"],
  ["sh", "ш"],
  ["ch", "ч"],
  ["yo", "ё"],
  ["yu", "ю"],
  ["ya", "я"],
  ["ye", "е"],
  ["ts", "ц"],
  ["zh", "ж"],
  ["kh", "х"],
  ["o'", "ў"],
  ["oʻ", "ў"],
  ["o’", "ў"],
  ["g'", "ғ"],
  ["gʻ", "ғ"],
  ["g’", "ғ"],
];

const latinSingles: Record<string, string> = {
  a: "а",
  b: "б",
  c: "к",
  d: "д",
  e: "е",
  f: "ф",
  g: "г",
  h: "х",
  i: "и",
  j: "ж",
  k: "к",
  l: "л",
  m: "м",
  n: "н",
  o: "о",
  p: "п",
  q: "қ",
  r: "р",
  s: "с",
  t: "т",
  u: "у",
  v: "в",
  w: "в",
  x: "х",
  y: "й",
  z: "з",
};

const cyrillicMap: Record<string, string> = {
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
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sch",
  ъ: "",
  ы: "i",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  қ: "q",
  ў: "oʻ",
  ғ: "gʻ",
  ҳ: "h",
};

const cyrillicPattern = /[Ѐ-ӿ]/gu;
const latinPattern = /[A-Za-z]/g;

function matchCase(source: string, output: string): string {
  const upper = source.toLocaleUpperCase();
  const isUpper = source === upper && source !== source.toLocaleLowerCase();
  if (!isUpper || output.length === 0) return output;
  return output.charAt(0).toLocaleUpperCase() + output.slice(1);
}

function latinToCyrillic(text: string): string {
  const lower = text.toLocaleLowerCase();
  let result = "";
  let index = 0;
  while (index < text.length) {
    const digraph = latinDigraphs.find(([pattern]) => lower.startsWith(pattern, index));
    if (digraph) {
      result += matchCase(text.charAt(index), digraph[1]);
      index += digraph[0].length;
      continue;
    }
    const char = text.charAt(index);
    const mapped = latinSingles[lower.charAt(index)];
    result += mapped ? matchCase(char, mapped) : char;
    index += 1;
  }
  return result;
}

function cyrillicToLatin(text: string): string {
  let result = "";
  for (const char of text) {
    const mapped = cyrillicMap[char.toLocaleLowerCase()];
    result += mapped === undefined ? char : matchCase(char, mapped);
  }
  return result;
}

export function transliterate(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const cyrillic = trimmed.match(cyrillicPattern)?.length ?? 0;
  const latin = trimmed.match(latinPattern)?.length ?? 0;
  if (cyrillic === 0 && latin === 0) return null;
  const converted = cyrillic > latin ? cyrillicToLatin(trimmed) : latinToCyrillic(trimmed);
  return converted === trimmed ? null : converted;
}
