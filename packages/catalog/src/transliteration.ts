export type LatinStyle = "uzbek" | "russian" | "informal";
export type CyrillicStyle = "uzbek" | "russian";
export type TransliterationTarget = "latin" | "cyrillic";

const apostropheClass = "'`´ʹʻʼʽʾʿˈ‘’‛′‵׳＇";
const apostropheGlobal = new RegExp(`[${apostropheClass}]`, "gu");
const apostropheSingle = new RegExp(`^[${apostropheClass}]$`, "u");

const turnedComma = "ʻ";
const modifierApostrophe = "ʼ";

const cyrillicLetter = /\p{Script=Cyrillic}/u;
const latinLetter = /\p{Script=Latin}/u;
const anyLetter = /\p{L}/u;

const cyrillicVowels = new Set([
  "а",
  "е",
  "ё",
  "и",
  "о",
  "у",
  "ы",
  "э",
  "ю",
  "я",
  "ў",
  "і",
  "є",
  "ї",
]);

interface CyrillicEntry {
  uzbek: string;
  russian: string;
  informal: string;
}

function entry(uzbek: string, russian = uzbek, informal = russian): CyrillicEntry {
  return { uzbek, russian, informal };
}

const cyrillicToLatinTable: Record<string, CyrillicEntry> = {
  а: entry("a"),
  б: entry("b"),
  в: entry("v"),
  г: entry("g"),
  д: entry("d"),
  е: entry("e"),
  ё: entry("yo"),
  ж: entry("j", "zh", "j"),
  з: entry("z"),
  и: entry("i"),
  й: entry("y"),
  к: entry("k"),
  л: entry("l"),
  м: entry("m"),
  н: entry("n"),
  о: entry("o"),
  п: entry("p"),
  р: entry("r"),
  с: entry("s"),
  т: entry("t"),
  у: entry("u"),
  ф: entry("f"),
  х: entry("x", "kh", "h"),
  ц: entry("ts"),
  ч: entry("ch"),
  ш: entry("sh"),
  щ: entry("shch", "shch", "sh"),
  ъ: entry(modifierApostrophe, "", "'"),
  ы: entry("i", "y", "y"),
  ь: entry(""),
  э: entry("e"),
  ю: entry("yu"),
  я: entry("ya"),
  ў: entry(`o${turnedComma}`, "u", "o'"),
  қ: entry("q", "k", "q"),
  ғ: entry(`g${turnedComma}`, "g", "g'"),
  ҳ: entry("h", "kh", "h"),
  ң: entry("ng"),
  ҷ: entry("j"),
  ӣ: entry("i"),
  і: entry("i"),
  ї: entry("yi"),
  є: entry("ye"),
  ґ: entry("g"),
  ә: entry("a"),
  ө: entry("o"),
  ү: entry("u"),
  һ: entry("h"),
};

function isUpper(character: string): boolean {
  return character !== character.toLowerCase();
}

function isLetter(character: string | undefined): character is string {
  return character !== undefined && anyLetter.test(character);
}

function wordIsUpperAround(characters: string[], first: number, last: number): boolean {
  const next = characters[last + 1];
  const previous = characters[first - 1];
  if (isLetter(next)) return isUpper(next);
  return isLetter(previous) && isUpper(previous);
}

function shapeCase(output: string, sourceUpper: boolean, allUpper: boolean): string {
  if (!sourceUpper || output.length === 0) return output;
  if (output.length === 1 || allUpper) return output.toUpperCase();
  return output.charAt(0).toUpperCase() + output.slice(1);
}

export function cyrillicToLatin(text: string, style: LatinStyle = "uzbek"): string {
  const characters = [...text.normalize("NFC")];
  let output = "";
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index] as string;
    const lower = character.toLowerCase();
    const mapping = cyrillicToLatinTable[lower];
    if (mapping === undefined) {
      output += character;
      continue;
    }
    let value = mapping[style];
    if (lower === "е") {
      const previous = characters[index - 1];
      const previousLower = previous === undefined ? "" : previous.toLowerCase();
      const startsWord = !isLetter(previous);
      const afterVowelOrSign =
        cyrillicVowels.has(previousLower) || previousLower === "ъ" || previousLower === "ь";
      value = style !== "informal" && (startsWord || afterVowelOrSign) ? "ye" : "e";
    }
    output += shapeCase(value, isUpper(character), wordIsUpperAround(characters, index, index));
  }
  return output;
}

export function normalizeApostrophes(text: string): string {
  return text.normalize("NFC").replace(apostropheGlobal, "'");
}

function canonicalizeApostrophes(text: string): string {
  const characters = [...text.normalize("NFC")];
  let output = "";
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index] as string;
    if (!apostropheSingle.test(character)) {
      output += character;
      continue;
    }
    const previous = characters[index - 1];
    if (previous !== undefined && /^[ogOG]$/.test(previous)) output += turnedComma;
    else if (isLetter(previous)) output += modifierApostrophe;
    else output += "'";
  }
  return output;
}

interface LatinRule {
  latin: string;
  uzbek: string;
  russian: string;
}

function rule(latin: string, uzbek: string, russian = uzbek): LatinRule {
  return { latin, uzbek, russian };
}

const latinRules: LatinRule[] = [
  rule("shch", "шч", "щ"),
  rule(`o${turnedComma}`, "ў", "у"),
  rule(`g${turnedComma}`, "ғ", "г"),
  rule("sh", "ш"),
  rule("ch", "ч"),
  rule("yo", "ё"),
  rule("yu", "ю"),
  rule("ya", "я"),
  rule("ye", "е"),
  rule("ts", "ц"),
  rule("kh", "х"),
  rule("zh", "ж"),
  rule("ng", "нг"),
  rule("ph", "ф"),
  rule("dj", "дж"),
  rule("th", "т"),
  rule("gh", "г"),
];

const latinSingles: Record<string, CyrillicPair> = {
  a: pair("а"),
  b: pair("б"),
  c: pair("к"),
  d: pair("д"),
  e: pair("е"),
  f: pair("ф"),
  g: pair("г"),
  h: pair("ҳ", "х"),
  i: pair("и"),
  j: pair("ж"),
  k: pair("к"),
  l: pair("л"),
  m: pair("м"),
  n: pair("н"),
  o: pair("о"),
  p: pair("п"),
  q: pair("қ", "к"),
  r: pair("р"),
  s: pair("с"),
  t: pair("т"),
  u: pair("у"),
  v: pair("в"),
  w: pair("в"),
  x: pair("х"),
  y: pair("й"),
  z: pair("з"),
};

interface CyrillicPair {
  uzbek: string;
  russian: string;
}

function pair(uzbek: string, russian = uzbek): CyrillicPair {
  return { uzbek, russian };
}

export function latinToCyrillic(text: string, style: CyrillicStyle = "uzbek"): string {
  const source = [...canonicalizeApostrophes(text)];
  let output = "";
  let index = 0;
  while (index < source.length) {
    const character = source[index] as string;
    const window = source
      .slice(index, index + 4)
      .join("")
      .toLowerCase();
    const matched = latinRules.find((candidate) => window.startsWith(candidate.latin));
    if (matched !== undefined) {
      const length = [...matched.latin].length;
      const upper = isUpper(character);
      output += shapeCase(
        matched[style],
        upper,
        wordIsUpperAround(source, index, index + length - 1),
      );
      index += length;
      continue;
    }
    const lower = character.toLowerCase();
    const previous = source[index - 1];
    const next = source[index + 1];
    const upper = isUpper(character);
    const allUpper = wordIsUpperAround(source, index, index);
    if (lower === "e" && !isLetter(previous) && style === "uzbek") {
      output += shapeCase("э", upper, allUpper);
    } else if (lower === "c" && next !== undefined && /[eiy]/i.test(next)) {
      output += shapeCase("с", upper, allUpper);
    } else if (character === modifierApostrophe) {
      output += isLetter(previous) && isLetter(next) ? "ъ" : "";
    } else if (character === turnedComma || character === "'") {
      output += "";
    } else {
      const single = latinSingles[lower];
      output += single === undefined ? character : shapeCase(single[style], upper, allUpper);
    }
    index += 1;
  }
  return output;
}

export function transliterate(text: string, target: "latin", style?: LatinStyle): string;
export function transliterate(text: string, target: "cyrillic", style?: CyrillicStyle): string;
export function transliterate(
  text: string,
  target: TransliterationTarget,
  style?: LatinStyle | CyrillicStyle,
): string {
  if (target === "latin")
    return cyrillicToLatin(text, (style as LatinStyle | undefined) ?? "uzbek");
  const cyrillicStyle: CyrillicStyle =
    style === "russian" || style === "informal" ? "russian" : "uzbek";
  return latinToCyrillic(text, cyrillicStyle);
}

const latinFoldTable: Record<string, string> = {
  ß: "ss",
  ø: "o",
  đ: "d",
  ð: "d",
  ł: "l",
  æ: "ae",
  œ: "oe",
  þ: "th",
  ı: "i",
  ħ: "h",
};

const cyrillicFoldTable: Record<string, string> = {
  ё: "е",
  й: "и",
  ў: "у",
  қ: "к",
  ғ: "г",
  ҳ: "х",
  ң: "н",
  ҷ: "ж",
  і: "и",
  ї: "и",
  є: "е",
  ґ: "г",
  ы: "и",
  э: "е",
  ъ: "",
  ь: "",
};

export function stripDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .normalize("NFC");
}

function foldLatinCharacters(text: string): string {
  let folded = "";
  for (const character of text) {
    const replacement = latinFoldTable[character];
    folded += replacement ?? stripDiacritics(character);
  }
  return folded;
}

export function normalizeForMatch(text: string): string {
  const lowered = text.normalize("NFKC").toLowerCase();
  let folded = "";
  for (const character of lowered) {
    const cyrillic = cyrillicFoldTable[character];
    if (cyrillic !== undefined) folded += cyrillic;
    else if (cyrillicLetter.test(character)) folded += character;
    else folded += foldLatinCharacters(character);
  }
  return folded
    .replace(apostropheGlobal, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

const phoneticRules: Array<[RegExp, string]> = [
  [/shch|sch/g, "s"],
  [/sh/g, "s"],
  [/dzh|zh|dj/g, "j"],
  [/ch/g, "c"],
  [/kh|x/g, "h"],
  [/gh/g, "g"],
  [/ph/g, "f"],
  [/q/g, "k"],
  [/w/g, "v"],
  [/yo/g, "o"],
  [/yu/g, "u"],
  [/ya/g, "a"],
  [/ye/g, "e"],
  [/([aeiou])y(?=[aeiou])/g, "$1"],
  [/y/g, "i"],
  [/c(?=[aou])/g, "k"],
  [/(.)\1+/g, "$1"],
];

export function phoneticKey(text: string): string {
  const latinized = cyrillicToLatin(text.normalize("NFKC").toLowerCase(), "informal");
  let key = foldLatinCharacters(latinized)
    .replace(apostropheGlobal, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  for (const [pattern, replacement] of phoneticRules) key = key.replace(pattern, replacement);
  return key;
}

function collapseWhitespace(text: string): string {
  return text.normalize("NFKC").replace(/\s+/gu, " ").trim();
}

const digraphPrefixes = new Set(["s", "c", "k", "z", "g", "t", "p", "d", "q"]);

function replaceStandaloneH(text: string, replacement: string): string {
  let output = "";
  for (let index = 0; index < text.length; index += 1) {
    const character = text.charAt(index);
    if (character.toLowerCase() !== "h") {
      output += character;
      continue;
    }
    const previous = index === 0 ? "" : text.charAt(index - 1).toLowerCase();
    output += digraphPrefixes.has(previous)
      ? character
      : character === "H"
        ? replacement.charAt(0).toUpperCase() + replacement.slice(1)
        : replacement;
  }
  return output;
}

function hasStandaloneH(text: string): boolean {
  return replaceStandaloneH(text, "#") !== text;
}

function replaceX(text: string, replacement: string): string {
  return text
    .replace(/x/g, replacement)
    .replace(/X/g, replacement.charAt(0).toUpperCase() + replacement.slice(1));
}

function replaceKh(text: string, replacement: string): string {
  return text
    .replace(/kh/g, replacement)
    .replace(/Kh/g, replacement.charAt(0).toUpperCase() + replacement.slice(1))
    .replace(/KH/g, replacement.toUpperCase());
}

function letterSwapVariants(latin: string): string[] {
  const results: string[] = [];
  if (/x/i.test(latin)) results.push(replaceX(latin, "h"), replaceX(latin, "kh"));
  if (/kh/i.test(latin)) results.push(replaceKh(latin, "h"), replaceKh(latin, "x"));
  if (hasStandaloneH(latin)) {
    results.push(replaceStandaloneH(latin, "x"), replaceStandaloneH(latin, "kh"));
  }
  if (/q/i.test(latin)) results.push(latin.replace(/q/g, "k").replace(/Q/g, "K"));
  if (/[aeiou]yeva?\b/i.test(latin)) results.push(latin.replace(/([aeiou])ye(va?)\b/gi, "$1e$2"));
  if (/[aeiou]eva?\b/i.test(latin)) results.push(latin.replace(/([aeiou])e(va?)\b/gi, "$1ye$2"));
  return results;
}

function apostropheVariants(latin: string): string[] {
  const canonical = canonicalizeApostrophes(latin);
  if (!canonical.includes(turnedComma) && !canonical.includes(modifierApostrophe)) return [];
  return [
    canonical.replace(/[ʻʼ]/g, "'"),
    canonical.replace(/[ʻʼ]/g, ""),
    canonical.replace(/ʼ/g, "'"),
    canonical.replace(/[ʻʼ]/g, "’"),
  ];
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (value.length === 0 || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
  }
  return result;
}

function roundRobin(lists: string[][]): string[] {
  const merged: string[] = [];
  const longest = Math.max(0, ...lists.map((list) => list.length));
  for (let position = 0; position < longest; position += 1) {
    for (const list of lists) {
      const value = list[position];
      if (value !== undefined) merged.push(value);
    }
  }
  return merged;
}

function asciiApostrophes(text: string): string {
  return text.replace(/[ʻʼ]/g, "'");
}

export interface SearchVariantOptions {
  max?: number;
}

export function searchVariants(query: string, options: SearchVariantOptions = {}): string[] {
  const max = Math.max(1, options.max ?? 6);
  const base = collapseWhitespace(query);
  if (base.length === 0) return [];
  const hasCyrillic = cyrillicLetter.test(base);
  const hasLatin = latinLetter.test(base);

  const latinForms = hasCyrillic
    ? unique([
        cyrillicToLatin(base, "informal"),
        cyrillicToLatin(base, "russian"),
        asciiApostrophes(cyrillicToLatin(base, "uzbek")),
      ])
    : [base];

  const scriptForms = hasCyrillic
    ? latinForms
    : hasLatin
      ? [latinToCyrillic(base, "russian"), latinToCyrillic(base, "uzbek")]
      : [];

  const apostropheForms = latinForms.flatMap(apostropheVariants);
  const swapForms = latinForms.flatMap(letterSwapVariants);

  const ordered = hasCyrillic
    ? roundRobin([scriptForms, apostropheForms, swapForms])
    : roundRobin([apostropheForms, swapForms, scriptForms]);

  return unique([base, ...ordered]).slice(0, max);
}
