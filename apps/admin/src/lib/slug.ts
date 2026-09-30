import { slugSchema } from "@joymusic/shared";

const cyrillic: Record<string, string> = {
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
  "\u0439": "y",
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
  щ: "sch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
  ў: "o",
  қ: "q",
  ғ: "g",
  ҳ: "h",
};

const combiningMarks = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(value: string): string {
  let transliterated = "";
  for (const character of value.normalize("NFC").toLowerCase()) {
    transliterated += cyrillic[character] ?? character;
  }
  return transliterated
    .normalize("NFKD")
    .replace(combiningMarks, "")
    .replace(/[ʻʼ'’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
}

export function isValidSlug(value: string): boolean {
  return slugSchema.safeParse(value).success;
}

export function alternativeSlug(slug: string, attempt: number): string {
  const suffix = `-${attempt + 1}`;
  return `${slug.slice(0, 48 - suffix.length).replace(/-+$/g, "")}${suffix}`;
}
