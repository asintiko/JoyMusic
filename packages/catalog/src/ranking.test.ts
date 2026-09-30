import { describe, expect, it } from "vitest";
import {
  baseTitle,
  dedupeKey,
  junkFamiliesIn,
  junkPenalty,
  matchScore,
  mergeAndDedupe,
  primaryArtist,
  rankCandidates,
} from "./ranking";
import type { Candidate } from "./ranking";
import { hit, makeTrack } from "./testing";
import { phoneticKey } from "./transliteration";

function candidate(track = makeTrack(), popularity: number | null = null, position = 0): Candidate {
  return { track, popularity, providerId: track.source, position };
}

describe("matchScore", () => {
  const key = phoneticKey;
  it("orders exact, artist, prefix, token and unrelated matches", () => {
    const query = key("habibi");
    const exact = matchScore(query, key("Habibi"), key("Shahzoda"));
    const prefix = matchScore(query, key("Habibi Albi"), key("Faydee"));
    const token = matchScore(query, key("Albi Habibi Remix"), key("Faydee"));
    const none = matchScore(query, key("Something Else"), key("Faydee"));
    expect(exact).toBeGreaterThan(prefix);
    expect(prefix).toBeGreaterThan(token);
    expect(token).toBeGreaterThan(none);
    expect(none).toBe(0);
  });

  it("scores an artist-only query highly for that artist", () => {
    const query = key("shahzoda");
    expect(matchScore(query, key("Habibi"), key("Shahzoda"))).toBeGreaterThan(1);
    expect(matchScore(query, key("Habibi"), key("Ozoda"))).toBeLessThan(0.3);
  });

  it("matches artist plus title in either order", () => {
    const query = key("shahzoda habibi");
    expect(matchScore(query, key("Habibi"), key("Shahzoda"))).toBe(1.2);
    expect(matchScore(key("habibi shahzoda"), key("Habibi"), key("Shahzoda"))).toBe(1.2);
  });

  it("gives partial credit to token prefixes", () => {
    const query = key("blind light");
    const partial = matchScore(query, key("Blinding Lights"), key("The Weeknd"));
    expect(partial).toBeGreaterThan(0.4);
    expect(partial).toBeLessThan(1);
  });

  it("returns zero for an empty query", () => {
    expect(matchScore("", "a", "b")).toBe(0);
  });

  it("matches across scripts and spelling variants", () => {
    expect(matchScore(key("Шахзода"), key("Habibi"), key("Shakhzoda"))).toBeGreaterThan(1);
    expect(
      matchScore(key("Ulugbek Rahmatullayev"), key("Tabib"), key("Ulugbek Rahmatullaev")),
    ).toBeGreaterThan(1);
  });
});

describe("junk detection", () => {
  it("flags karaoke, tribute, instrumental, cover and lullaby versions", () => {
    expect(junkFamiliesIn(makeTrack({ title: "Scream (Karaoke Version)" }))).toContain("karaoke");
    expect(junkFamiliesIn(makeTrack({ artist: "Vitamin String Quartet Tribute" }))).toContain(
      "tribute",
    );
    expect(junkFamiliesIn(makeTrack({ title: "Song (Instrumental)" }))).toContain("instrumental");
    expect(junkFamiliesIn(makeTrack({ title: "Greska (Cover)" }))).toContain("cover");
    expect(junkFamiliesIn(makeTrack({ title: "Song (Караоке)" }))).toContain("karaoke");
    expect(junkFamiliesIn(makeTrack({ album: "Lullaby Versions of Hits" }))).toContain("novelty");
    expect(junkFamiliesIn(makeTrack({ title: "Song made famous by Someone" }))).toContain(
      "stylized",
    );
  });

  it("does not flag normal titles that merely contain similar words", () => {
    expect(junkFamiliesIn(makeTrack({ title: "Cover Me Up" }))).toEqual([]);
    expect(junkFamiliesIn(makeTrack({ title: "Discovery", artist: "Uncovered" }))).toEqual([]);
    expect(junkFamiliesIn(makeTrack({ title: "Alamlar" }))).toEqual([]);
  });

  it("penalizes junk unless the query asks for it", () => {
    const karaoke = makeTrack({ title: "Scream (Karaoke Version)" });
    expect(junkPenalty(karaoke, "sergey lazarev scream")).toBeGreaterThan(0);
    expect(junkPenalty(karaoke, "scream karaoke")).toBe(0);
    expect(junkPenalty(karaoke, "скрим караоке")).toBe(0);
    const instrumental = makeTrack({ title: "Song (Instrumental)" });
    expect(junkPenalty(instrumental, "song")).toBeGreaterThan(0);
    expect(junkPenalty(instrumental, "song instrumental")).toBe(0);
    expect(junkPenalty(makeTrack({ title: "Plain" }), "plain")).toBe(0);
  });
});

describe("rankCandidates", () => {
  const options = (query: string) => ({ queries: [query], original: query });

  it("puts exact matches ahead of popular unrelated tracks", () => {
    const exact = candidate(
      makeTrack({ sourceId: "1", title: "Habibi", artist: "Shahzoda" }),
      0.05,
    );
    const popular = candidate(
      makeTrack({ sourceId: "2", title: "Other Song", artist: "Big Star" }),
      1,
    );
    const [first] = rankCandidates([popular, exact], options("habibi"));
    expect(first?.track.sourceId).toBe("1");
  });

  it("uses popularity, artwork and preview as tie-breakers", () => {
    const base = { title: "Habibi", artist: "Shahzoda" };
    const plain = candidate(
      makeTrack({ sourceId: "1", ...base, artworkUrl: null, previewUrl: null }),
      0.2,
    );
    const popular = candidate(
      makeTrack({ sourceId: "2", ...base, artworkUrl: null, previewUrl: null }),
      0.9,
    );
    const pretty = candidate(makeTrack({ sourceId: "3", ...base }), 0.2);
    const ranked = rankCandidates([plain, popular, pretty], options("habibi"));
    expect(ranked.map((entry) => entry.track.sourceId)).toEqual(["2", "3", "1"]);
  });

  it("pushes karaoke and tribute versions to the bottom", () => {
    const original = candidate(
      makeTrack({ sourceId: "1", title: "Scream", artist: "Sergey Lazarev" }),
      0.2,
    );
    const karaoke = candidate(
      makeTrack({ sourceId: "2", title: "Scream (Karaoke Version)", artist: "Sergey Lazarev" }),
      0.9,
    );
    const ranked = rankCandidates([karaoke, original], options("sergey lazarev scream"));
    expect(ranked[0]?.track.sourceId).toBe("1");
  });

  it("keeps karaoke on top when the query asks for karaoke", () => {
    const original = candidate(
      makeTrack({ sourceId: "1", title: "Scream", artist: "Sergey Lazarev" }),
      0.2,
    );
    const karaoke = candidate(
      makeTrack({ sourceId: "2", title: "Scream (Karaoke Version)", artist: "Sergey Lazarev" }),
      0.2,
    );
    const ranked = rankCandidates([original, karaoke], options("scream karaoke"));
    expect(ranked[0]?.track.sourceId).toBe("2");
  });

  it("scores against every query variant so alternate spellings match", () => {
    const track = candidate(makeTrack({ title: "Hayot Ayt", artist: "Shakhzoda" }));
    const [ranked] = rankCandidates([track], {
      queries: ["Шахзода", "shakhzoda"],
      original: "Шахзода",
    });
    expect(ranked?.matchScore).toBeGreaterThan(1);
  });

  it("prefers earlier provider positions when everything else is equal", () => {
    const first = candidate(makeTrack({ sourceId: "1", title: "Habibi", artist: "A" }), null, 0);
    const later = candidate(makeTrack({ sourceId: "2", title: "Habibi", artist: "B" }), null, 9);
    const ranked = rankCandidates([later, first], options("habibi"));
    expect(ranked[0]?.track.sourceId).toBe("1");
  });
});

describe("dedupe keys", () => {
  it("strips feature credits and edit noise from titles", () => {
    expect(baseTitle("Titanium (feat. Sia)")).toBe("Titanium");
    expect(baseTitle("Levels - Radio Edit")).toBe("Levels");
    expect(baseTitle("Yellow (Remastered 2009)")).toBe("Yellow");
    expect(baseTitle("Birthday (Remastered 2009)")).toBe("Birthday");
    expect(baseTitle("Song [Album Version]")).toBe("Song");
    expect(baseTitle("Song (Remix)")).toBe("Song (Remix)");
  });

  it("takes the first credited artist", () => {
    expect(primaryArtist("Shakhzoda & Shoxrux")).toBe("Shakhzoda");
    expect(primaryArtist("Kygo feat. Selena Gomez")).toBe("Kygo");
    expect(primaryArtist("Artik & Asti")).toBe("Artik");
    expect(primaryArtist("Ани Лорак и Григорий Лепс")).toBe("Ани Лорак");
    expect(primaryArtist("Solo Artist")).toBe("Solo Artist");
  });

  it("treats transliterated artists and decorated titles as the same track", () => {
    const deezer = makeTrack({
      source: "deezer",
      sourceId: "1",
      artist: "Shahzoda",
      title: "Habibi",
    });
    const itunes = makeTrack({
      source: "itunes",
      sourceId: "2",
      artist: "Shakhzoda",
      title: "Habibi (Radio Edit)",
    });
    const cyrillic = makeTrack({
      source: "itunes",
      sourceId: "3",
      artist: "Шахзода",
      title: "Habibi",
    });
    expect(dedupeKey(deezer)).toBe(dedupeKey(itunes));
    expect(dedupeKey(deezer)).toBe(dedupeKey(cyrillic));
    expect(dedupeKey(deezer)).not.toBe(
      dedupeKey(makeTrack({ artist: "Shahzoda", title: "Maqtanchoq" })),
    );
  });
});

describe("mergeAndDedupe", () => {
  const ranked = (entries: Candidate[]) =>
    rankCandidates(entries, { queries: ["habibi"], original: "habibi" });

  it("collapses duplicates and prefers the entry with artwork and preview", () => {
    const bare = candidate(
      makeTrack({
        source: "itunes",
        sourceId: "9",
        title: "Habibi",
        artist: "Shahzoda",
        artworkUrl: null,
        previewUrl: null,
      }),
    );
    const rich = candidate(
      makeTrack({ source: "deezer", sourceId: "1", title: "Habibi", artist: "Shahzoda" }),
      0.3,
    );
    const merged = mergeAndDedupe(ranked([bare, rich]));
    expect(merged).toHaveLength(1);
    expect(merged[0]?.track.id).toBe("deezer:1");
  });

  it("fills missing fields from the discarded duplicate", () => {
    const withArt = candidate(
      makeTrack({
        source: "deezer",
        sourceId: "1",
        title: "Habibi",
        artist: "Shahzoda",
        previewUrl: null,
        album: null,
        durationSec: null,
      }),
    );
    const withPreview = candidate(
      makeTrack({
        source: "itunes",
        sourceId: "2",
        title: "Habibi",
        artist: "Shakhzoda",
        artworkUrl: null,
        previewUrl: "https://preview.example/itunes.m4a",
        album: "Baxtliman",
        durationSec: 198,
        explicit: true,
      }),
    );
    const [only] = mergeAndDedupe(ranked([withArt, withPreview]));
    expect(only?.track.id).toBe("deezer:1");
    expect(only?.track.previewUrl).toBe("https://preview.example/itunes.m4a");
    expect(only?.track.album).toBe("Baxtliman");
    expect(only?.track.durationSec).toBe(198);
    expect(only?.track.explicit).toBe(true);
  });

  it("prefers the more popular entry when completeness is equal", () => {
    const low = candidate(makeTrack({ sourceId: "1", title: "Habibi", artist: "Shahzoda" }), 0.1);
    const high = candidate(makeTrack({ sourceId: "2", title: "Habibi", artist: "Shahzoda" }), 0.8);
    const [only] = mergeAndDedupe(ranked([low, high]));
    expect(only?.track.sourceId).toBe("2");
    expect(only?.popularity).toBe(0.8);
  });

  it("keeps distinct tracks and sorts by score", () => {
    const one = candidate(makeTrack({ sourceId: "1", title: "Habibi", artist: "Shahzoda" }));
    const two = candidate(
      makeTrack({ sourceId: "2", title: "Habibi (Remix)", artist: "Shahzoda" }),
    );
    const three = candidate(makeTrack({ sourceId: "3", title: "Maqtanchoq", artist: "Shahzoda" }));
    const merged = mergeAndDedupe(ranked([three, two, one]));
    expect(merged).toHaveLength(3);
    expect(merged[0]?.track.sourceId).toBe("1");
  });

  it("returns an empty list for no input", () => {
    expect(mergeAndDedupe([])).toEqual([]);
    expect(hit(makeTrack()).popularity).toBeNull();
  });
});
