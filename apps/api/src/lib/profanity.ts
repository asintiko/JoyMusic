import { findBlockedWord, toMatchKey } from "./text";

const builtinWords = [
  "fuck",
  "motherfucker",
  "shit",
  "bullshit",
  "bitch",
  "asshole",
  "cunt",
  "pussy",
  "whore",
  "slut",
  "nigger",
  "faggot",
  "bastard",
  "хуй",
  "хуе",
  "хуя",
  "хуё",
  "пизд",
  "ебан",
  "ебат",
  "ебал",
  "ебну",
  "ебуч",
  "заеб",
  "блят",
  "блядь",
  "сука",
  "сучк",
  "мудак",
  "мудил",
  "говно",
  "залуп",
  "пидор",
  "пидар",
  "пидр",
  "гандон",
  "шлюх",
  "дроч",
  "ublyud",
  "jalab",
  "jalap",
  "qahba",
  "qaxba",
  "onangni",
  "onamni",
  "ammangni",
  "sikaman",
  "sikay",
  "sikib",
  "qotoq",
  "dalbayob",
  "dalbayop",
  "гандон",
  "жалаб",
  "қаҳба",
  "онангни",
  "сикаман",
  "қотоқ",
  "долбаёб",
];

const lookalikes: Record<string, string> = {
  а: "a",
  в: "b",
  е: "e",
  ё: "e",
  з: "3",
  к: "k",
  м: "m",
  н: "h",
  о: "o",
  р: "p",
  с: "c",
  т: "t",
  у: "y",
  х: "x",
  і: "i",
  ї: "i",
  ѕ: "s",
  ј: "j",
};

const leetSpeak: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  $: "s",
  "!": "i",
  "€": "e",
};

export const builtinMatchKeys: readonly string[] = [
  ...new Set(builtinWords.map((word) => toMatchKey(word)).filter((key) => key.length >= 2)),
];

function foldLookalikes(text: string): string {
  return Array.from(text.toLowerCase())
    .map((character) => lookalikes[character] ?? character)
    .join("");
}

function foldLeetSpeak(text: string): string {
  return Array.from(text.toLowerCase())
    .map((character) => leetSpeak[character] ?? character)
    .join("");
}

export function profanityVariants(text: string): string[] {
  const collapsed = text.replace(/(\p{L})\1+/gu, "$1");
  const lookalikeFolded = foldLookalikes(text);
  return [
    ...new Set([
      text,
      collapsed,
      lookalikeFolded,
      foldLeetSpeak(text),
      foldLeetSpeak(lookalikeFolded),
      text.replace(/[\s._\-*+~|/\\]+/g, ""),
    ]),
  ];
}

const substringStemLength = 5;

function matchesStem(key: string, stem: string): boolean {
  const tokens = key.split(" ");
  if (tokens.some((token) => token.startsWith(stem))) return true;
  if (stem.length < substringStemLength) return false;
  return key.includes(stem) || tokens.join("").includes(stem);
}

export function findProfanity(
  text: string,
  organizationMatchKeys: readonly string[] = [],
): string | null {
  for (const variant of profanityVariants(text)) {
    const key = toMatchKey(variant);
    if (key.length === 0) continue;
    for (const stem of builtinMatchKeys) {
      if (matchesStem(key, stem)) return stem;
    }
    const organizationHit = findBlockedWord(variant, organizationMatchKeys);
    if (organizationHit) return organizationHit;
  }
  return null;
}
