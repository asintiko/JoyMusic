import { describe, expect, it } from "vitest";
import { nowPlayingProgress } from "@joymusic/shared";
import { themeMeta } from "@joymusic/ui";
import { createOffsetEstimator } from "@/lib/clock";
import { artworkSrc, isAllowedArtworkHost, resizeArtwork } from "@/lib/art";
import { parseAcceptLanguage, resolveLocale } from "@/lib/locale";
import { messages } from "@/lib/messages";
import { createMemoryStore, createStorage, readJson } from "@/lib/storage";
import { parseTheme, themeBrand, themeCanvas } from "@/lib/theme";
import { transliterate } from "@/lib/translit";

describe("offset estimator and progress", () => {
  it("prefers the sample with the least latency", () => {
    const estimator = createOffsetEstimator();
    estimator.sample("2026-09-30T20:00:10.000Z", Date.parse("2026-09-30T20:00:10.400Z"));
    estimator.sample("2026-09-30T20:00:20.000Z", Date.parse("2026-09-30T20:00:20.050Z"));
    estimator.sample("2026-09-30T20:00:30.000Z", Date.parse("2026-09-30T20:00:30.900Z"));
    expect(estimator.value()).toBe(-50);
  });

  it("ignores invalid samples", () => {
    const estimator = createOffsetEstimator();
    expect(estimator.sample("garbage", 0)).toBe(0);
  });

  it("keeps a bounded window", () => {
    const estimator = createOffsetEstimator(2);
    estimator.sample("2026-09-30T20:00:00.000Z", Date.parse("2026-09-30T20:00:00.000Z"));
    estimator.sample("2026-09-30T20:00:00.000Z", Date.parse("2026-09-30T20:00:00.500Z"));
    estimator.sample("2026-09-30T20:00:00.000Z", Date.parse("2026-09-30T20:00:00.800Z"));
    expect(estimator.value()).toBe(-500);
  });

  it("computes progress from the server clock, not the device clock", () => {
    const startedAt = "2026-09-30T20:00:00.000Z";
    const deviceNow = Date.parse("2026-09-30T20:00:40.000Z");
    const offsetMs = 20_000;
    expect(nowPlayingProgress(startedAt, 120, deviceNow, offsetMs)).toBeCloseTo(0.5, 5);
    expect(nowPlayingProgress(startedAt, 120, deviceNow, 0)).toBeCloseTo(1 / 3, 5);
    expect(nowPlayingProgress(startedAt, null, deviceNow, 0)).toBe(0);
    expect(nowPlayingProgress(startedAt, 10, deviceNow, 0)).toBe(1);
  });
});

describe("locale resolution", () => {
  it("parses Accept-Language by quality", () => {
    expect(parseAcceptLanguage("de;q=0.9, ru;q=0.8, en;q=0.4")).toBe("ru");
    expect(parseAcceptLanguage("uz-Latn-UZ,en;q=0.5")).toBe("uz");
    expect(parseAcceptLanguage("fr, de")).toBeNull();
    expect(parseAcceptLanguage(null)).toBeNull();
  });

  it("prefers override, then cookie, then browser, then venue default", () => {
    const base = { venueDefault: "uz" as const, acceptLanguage: "en-US,en;q=0.9" };
    expect(resolveLocale({ ...base, override: "ru", cookie: "en" })).toBe("ru");
    expect(resolveLocale({ ...base, cookie: "ru" })).toBe("ru");
    expect(resolveLocale({ ...base })).toBe("en");
    expect(resolveLocale({ venueDefault: "ru", acceptLanguage: "fr" })).toBe("ru");
    expect(resolveLocale({ ...base, preferNavigator: false })).toBe("uz");
    expect(resolveLocale({ ...base, override: "xx" })).toBe("en");
  });
});

describe("theme tokens", () => {
  it("stay in sync with the design system", () => {
    for (const theme of ["club", "lounge", "cafe"] as const) {
      expect(themeCanvas[theme]).toBe(themeMeta[theme].canvas);
      expect(themeBrand[theme]).toBe(themeMeta[theme].brand);
    }
  });

  it("parses theme overrides safely", () => {
    expect(parseTheme("lounge", "club")).toBe("lounge");
    expect(parseTheme("neon", "cafe")).toBe("cafe");
    expect(parseTheme(null, "club")).toBe("club");
  });
});

describe("transliteration", () => {
  it("converts latin names to cyrillic and back", () => {
    expect(transliterate("Shahzoda")).toBe("Шахзода");
    expect(transliterate("Шахзода")).toBe("Shahzoda");
    expect(transliterate("Ozodbek")).toBe("Озодбек");
    expect(transliterate("Qo'shiq")).toBe("Қўшиқ");
  });

  it("returns null for digits, empty input and unchanged text", () => {
    expect(transliterate("")).toBeNull();
    expect(transliterate("123")).toBeNull();
  });

  it("keeps capitalisation of digraphs", () => {
    expect(transliterate("Shohruh")).toBe("Шохрух");
    expect(transliterate("CHOY")).toBe("ЧОЙ");
  });
});

describe("artwork helpers", () => {
  it("only proxies known cover hosts", () => {
    expect(isAllowedArtworkHost("cdn-images.dzcdn.net")).toBe(true);
    expect(isAllowedArtworkHost("is1-ssl.mzstatic.com")).toBe(true);
    expect(isAllowedArtworkHost("evil.example.com")).toBe(false);
    expect(isAllowedArtworkHost("dzcdn.net.evil.com")).toBe(false);
  });

  it("resizes deezer and itunes covers", () => {
    expect(
      resizeArtwork(
        "https://cdn-images.dzcdn.net/images/cover/abc/1000x1000-000000-80-0-0.jpg",
        250,
      ),
    ).toBe("https://cdn-images.dzcdn.net/images/cover/abc/250x250-000000-80-0-0.jpg");
    expect(resizeArtwork("https://is1-ssl.mzstatic.com/image/x/100x100bb.jpg", 600)).toBe(
      "https://is1-ssl.mzstatic.com/image/x/600x600bb.jpg",
    );
  });

  it("builds a same-origin proxy url and passes unknown hosts through", () => {
    const proxied = artworkSrc(
      "https://cdn-images.dzcdn.net/images/cover/abc/1000x1000-000000-80-0-0.jpg",
      120,
    );
    expect(proxied?.startsWith("/art?u=")).toBe(true);
    expect(decodeURIComponent(proxied ?? "")).toContain("120x120");
    expect(artworkSrc("https://example.com/a.jpg", 120)).toBe("https://example.com/a.jpg");
    expect(artworkSrc(null, 120)).toBeNull();
  });
});

describe("storage", () => {
  it("falls back to memory when the backend throws", () => {
    const backend = {
      getItem: () => {
        throw new Error("x");
      },
      setItem: () => {
        throw new Error("x");
      },
      removeItem: () => {
        throw new Error("x");
      },
    } as unknown as Storage;
    const store = createStorage(backend);
    store.set("a", "1");
    expect(store.get("a")).toBe("1");
    store.remove("a");
    expect(store.get("a")).toBeNull();
  });

  it("reads json with a fallback", () => {
    const store = createMemoryStore();
    store.set("bad", "{");
    expect(readJson(store, "bad", 5)).toBe(5);
    expect(readJson(store, "missing", "x")).toBe("x");
  });
});

describe("messages", () => {
  it("cover the same keys in every locale", () => {
    const keys = Object.keys(messages.uz).sort();
    expect(Object.keys(messages.ru).sort()).toEqual(keys);
    expect(Object.keys(messages.en).sort()).toEqual(keys);
  });

  it("use the modifier apostrophe in uzbek copy", () => {
    const text = Object.values(messages.uz)
      .filter((value): value is string => typeof value === "string")
      .join(" ");
    expect(text).not.toMatch(/[oOgG]'/);
  });
});
