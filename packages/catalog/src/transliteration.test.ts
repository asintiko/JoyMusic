import { describe, expect, it } from "vitest";
import {
  cyrillicToLatin,
  latinToCyrillic,
  normalizeApostrophes,
  normalizeForMatch,
  phoneticKey,
  searchVariants,
  stripDiacritics,
  transliterate,
} from "./transliteration";

describe("cyrillicToLatin uzbek style", () => {
  const cases: Array<[string, string]> = [
    ["Шаҳзода", "Shahzoda"],
    ["Шахзода", "Shaxzoda"],
    ["Озода", "Ozoda"],
    ["Райҳон", "Rayhon"],
    ["Ҳамдам Собиров", "Hamdam Sobirov"],
    ["Хамдам Собиров", "Xamdam Sobirov"],
    ["Ўлуғбек Раҳматуллаев", "Oʻlugʻbek Rahmatullayev"],
    ["Қора атиргул", "Qora atirgul"],
    ["Юлдуз Усмонова", "Yulduz Usmonova"],
    ["Ёқубжон", "Yoqubjon"],
    ["Жасур Умиров", "Jasur Umirov"],
    ["Муниса Ризаева", "Munisa Rizayeva"],
    ["Ғулом", "Gʻulom"],
    ["Чайхана", "Chayxana"],
    ["Ёр-ёр", "Yor-yor"],
    ["Ўзбекистон", "Oʻzbekiston"],
    ["Бўстон", "Boʻston"],
    ["Санъат", "Sanʼat"],
    ["Ева", "Yeva"],
    ["Елена", "Yelena"],
    ["Ани Лорак", "Ani Lorak"],
    ["Полина Гагарина", "Polina Gagarina"],
    ["Щука", "Shchuka"],
    ["ШАХЗОДА", "SHAXZODA"],
    ["Ш", "Sh"],
    ["Дилноза", "Dilnoza"],
    ["Мирзабек Холмедов", "Mirzabek Xolmedov"],
  ];
  it.each(cases)("%s -> %s", (input, expected) => {
    expect(cyrillicToLatin(input, "uzbek")).toBe(expected);
  });
});

describe("cyrillicToLatin russian and informal styles", () => {
  it("uses kh and zh in russian style", () => {
    expect(cyrillicToLatin("Шахзода", "russian")).toBe("Shakhzoda");
    expect(cyrillicToLatin("Жанна Хамидова", "russian")).toBe("Zhanna Khamidova");
    expect(cyrillicToLatin("Ўлуғбек", "russian")).toBe("Ulugbek");
    expect(cyrillicToLatin("Қора", "russian")).toBe("Kora");
  });

  it("uses h and ascii apostrophes in informal style", () => {
    expect(cyrillicToLatin("Шахзода", "informal")).toBe("Shahzoda");
    expect(cyrillicToLatin("Ўзбек", "informal")).toBe("O'zbek");
    expect(cyrillicToLatin("Ғани", "informal")).toBe("G'ani");
    expect(cyrillicToLatin("Елена", "informal")).toBe("Elena");
  });

  it("keeps non-cyrillic characters untouched", () => {
    expect(cyrillicToLatin("Zivert - Life 2024", "informal")).toBe("Zivert - Life 2024");
  });
});

describe("latinToCyrillic", () => {
  const uzbekCases: Array<[string, string]> = [
    ["Shahzoda", "Шаҳзода"],
    ["Ozoda", "Озода"],
    ["Rayhon", "Райҳон"],
    ["Xamdam Sobirov", "Хамдам Собиров"],
    ["Oʻlugʻbek", "Ўлуғбек"],
    ["O'zbekiston", "Ўзбекистон"],
    ["Ulug‘bek", "Улуғбек"],
    ["Qora atirgul", "Қора атиргул"],
    ["Yulduz Usmonova", "Юлдуз Усмонова"],
    ["Yoqub", "Ёқуб"],
    ["Jasur", "Жасур"],
    ["Chayxana", "Чайхана"],
    ["Sevinch Mo‘minova", "Севинч Мўминова"],
    ["Sog'inib", "Соғиниб"],
    ["Bojalar", "Божалар"],
    ["Ma'no", "Маъно"],
    ["Eldor", "Элдор"],
    ["SHAHZODA", "ШАҲЗОДА"],
    ["Konsta", "Конста"],
  ];
  it.each(uzbekCases)("uzbek %s -> %s", (input, expected) => {
    expect(latinToCyrillic(input, "uzbek")).toBe(expected);
  });

  const russianCases: Array<[string, string]> = [
    ["Shahzoda", "Шахзода"],
    ["Ulug'bek Rahmatullaev", "Улугбек Рахматуллаев"],
    ["Qora", "Кора"],
    ["Yulduz", "Юлдуз"],
    ["Elena", "Елена"],
  ];
  it.each(russianCases)("russian %s -> %s", (input, expected) => {
    expect(latinToCyrillic(input, "russian")).toBe(expected);
  });

  it("round trips common Uzbek names through the official alphabet", () => {
    const names = [
      "Shahzoda",
      "Ozoda",
      "Rayhon",
      "Oʻlugʻbek",
      "Qora atirgul",
      "Yulduz Usmonova",
      "Sevinch Moʻminova",
      "Jasur Umirov",
      "Bunyodbek Saidov",
      "Dildora Niyozova",
    ];
    for (const name of names) {
      expect(cyrillicToLatin(latinToCyrillic(name, "uzbek"), "uzbek")).toBe(name);
    }
  });
});

describe("transliterate", () => {
  it("dispatches by target and style", () => {
    expect(transliterate("Шахзода", "latin")).toBe("Shaxzoda");
    expect(transliterate("Шахзода", "latin", "informal")).toBe("Shahzoda");
    expect(transliterate("shahzoda", "cyrillic")).toBe("шаҳзода");
    expect(transliterate("shahzoda", "cyrillic", "russian")).toBe("шахзода");
  });
});

describe("normalizeApostrophes", () => {
  it("unifies every apostrophe-like character to ascii", () => {
    for (const mark of ["'", "ʻ", "ʼ", "‘", "’", "`", "´", "′"]) {
      expect(normalizeApostrophes(`o${mark}zbek g${mark}alaba`)).toBe("o'zbek g'alaba");
    }
  });
});

describe("stripDiacritics", () => {
  it("removes combining marks", () => {
    expect(stripDiacritics("Tiësto")).toBe("Tiesto");
    expect(stripDiacritics("Céline Dion")).toBe("Celine Dion");
    expect(stripDiacritics("Beyoncé")).toBe("Beyonce");
  });
});

describe("normalizeForMatch", () => {
  it("case-folds, strips diacritics and punctuation", () => {
    expect(normalizeForMatch("  Tiësto — The Business!  ")).toBe("tiesto the business");
    expect(normalizeForMatch("Céline   DION")).toBe("celine dion");
  });

  it("removes all apostrophe forms so spellings compare equal", () => {
    const forms = ["Oʻzbek", "O'zbek", "O‘zbek", "O’zbek", "Ozbek", "O`zbek", "Oʼzbek"];
    const normalized = new Set(forms.map(normalizeForMatch));
    expect([...normalized]).toEqual(["ozbek"]);
  });

  it("folds uzbek cyrillic letters and yo/yi", () => {
    expect(normalizeForMatch("Ўлуғбек")).toBe("улугбек");
    expect(normalizeForMatch("Қора Ҳаёт")).toBe("кора хает");
    expect(normalizeForMatch("Ёлка")).toBe("елка");
    expect(normalizeForMatch("Майя")).toBe("маия");
  });

  it("folds ligatures", () => {
    expect(normalizeForMatch("Straße Œuvre")).toBe("strasse oeuvre");
  });

  it("handles empty and symbol-only input", () => {
    expect(normalizeForMatch("")).toBe("");
    expect(normalizeForMatch("!!! ???")).toBe("");
  });
});

describe("phoneticKey", () => {
  const groups: string[][] = [
    ["Shahzoda", "Shakhzoda", "Shaxzoda", "Шахзода", "Шаҳзода", "SHAHZODA"],
    ["Xamdam Sobirov", "Hamdam Sobirov", "Khamdam Sobirov", "Хамдам Собиров", "Ҳамдам Собиров"],
    [
      "Ulug'bek Rahmatullayev",
      "Ulugbek Rahmatullaev",
      "Ulugʻbek Rahmatullayev",
      "Улугбек Рахматуллаев",
    ],
    ["Qora atirgul", "Kora atirgul", "Қора атиргул", "Кора атиргул"],
    ["Jo'rayev", "Jorayev", "Joraev", "Жўраев"],
    ["Yulduz", "Юлдуз", "YULDUZ"],
    ["Sog'inib", "Soginib", "Соғиниб"],
    ["Chayxana", "Chayhana", "Chaykhana", "Чайхана"],
  ];
  it.each(groups)("treats spelling variants of %s as one key", (...variants) => {
    const keys = new Set(variants.map(phoneticKey));
    expect([...keys]).toHaveLength(1);
  });

  it("keeps different names apart", () => {
    expect(phoneticKey("Ozoda")).not.toBe(phoneticKey("Shahzoda"));
    expect(phoneticKey("Rayhon")).not.toBe(phoneticKey("Konsta"));
  });
});

describe("searchVariants", () => {
  it("always starts with the whitespace-collapsed original", () => {
    expect(searchVariants("  shahzoda   habibi ")[0]).toBe("shahzoda habibi");
  });

  it("returns nothing for blank input", () => {
    expect(searchVariants("   ")).toEqual([]);
  });

  it("expands latin queries with x/h/kh swaps and cyrillic forms", () => {
    const variants = searchVariants("shahzoda", { max: 10 });
    expect(variants).toContain("shaxzoda");
    expect(variants).toContain("shakhzoda");
    expect(variants).toContain("шахзода");
    expect(variants).toContain("шаҳзода");
  });

  it("expands xamdam to h and kh forms", () => {
    const variants = searchVariants("Xamdam Sobirov", { max: 10 });
    expect(variants).toContain("Hamdam Sobirov");
    expect(variants).toContain("Khamdam Sobirov");
    expect(variants).toContain("Хамдам Собиров");
  });

  it("expands cyrillic queries into latin styles", () => {
    const variants = searchVariants("Шахзода", { max: 10 });
    expect(variants).toContain("Shahzoda");
    expect(variants).toContain("Shakhzoda");
    expect(variants).toContain("Shaxzoda");
  });

  it("expands apostrophe forms", () => {
    const variants = searchVariants("Ulugʻbek", { max: 10 });
    expect(variants).toContain("Ulug'bek");
    expect(variants).toContain("Ulugbek");
    const typed = searchVariants("Sog‘inib", { max: 10 });
    expect(typed).toContain("Sog'inib");
    expect(typed).toContain("Soginib");
  });

  it("swaps the yev suffix in both directions", () => {
    expect(searchVariants("Rahmatullayev", { max: 12 })).toContain("Rahmatullaev");
    expect(searchVariants("Rahmatullaev", { max: 12 })).toContain("Rahmatullayev");
    expect(searchVariants("Jo'rayev", { max: 12 })).toContain("Jo'raev");
  });

  it("swaps q and k", () => {
    expect(searchVariants("qora atirgul", { max: 12 })).toContain("kora atirgul");
  });

  it("keeps the mixed-script query and adds an all-latin form", () => {
    const variants = searchVariants("Шахзода Habibi", { max: 10 });
    expect(variants[0]).toBe("Шахзода Habibi");
    expect(variants).toContain("Shahzoda Habibi");
  });

  it("respects the max cap and never returns duplicates", () => {
    const variants = searchVariants("Xamdam Sobirov qora", { max: 3 });
    expect(variants).toHaveLength(3);
    expect(new Set(variants.map((value) => value.toLowerCase())).size).toBe(variants.length);
  });

  it("does not multiply plain english queries beyond a couple of forms", () => {
    const variants = searchVariants("blinding lights", { max: 10 });
    expect(variants[0]).toBe("blinding lights");
    expect(variants.length).toBeLessThanOrEqual(4);
  });

  it("interleaves categories so a small cap still mixes script and spelling variants", () => {
    const variants = searchVariants("shahzoda", { max: 3 });
    expect(variants).toHaveLength(3);
    expect(variants.some((value) => /[а-я]/i.test(value)) || variants.includes("shaxzoda")).toBe(
      true,
    );
  });
});
