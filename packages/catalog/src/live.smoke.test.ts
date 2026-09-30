import { describe, expect, it } from "vitest";
import { trackSchema } from "@joymusic/shared";
import { createCatalog } from "./catalog";
import { createDeezerProvider } from "./providers/deezer";
import { createItunesProvider } from "./providers/itunes";
import { sectionSeeds } from "./seeds";

const live = process.env.JOY_LIVE === "1";

describe.skipIf(!live)("live catalog smoke (opt-in, real network)", () => {
  it("deezer search returns tracks that satisfy the shared schema", async () => {
    const hits = await createDeezerProvider().search("shahzoda", 5);
    expect(hits.length).toBeGreaterThan(0);
    for (const entry of hits) expect(trackSchema.safeParse(entry.track).success).toBe(true);
  });

  it("itunes search returns tracks with upgraded artwork", async () => {
    const hits = await createItunesProvider().search("shakhzoda", 5);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((entry) => entry.track.artworkUrl?.includes("600x600"))).toBe(true);
  });

  it("finds Shahzoda through both spellings and a cyrillic query", async () => {
    const catalog = createCatalog();
    for (const query of ["shahzoda", "shakhzoda", "Шахзода"]) {
      const tracks = await catalog.search(query, 10);
      expect(tracks.length, query).toBeGreaterThan(0);
      expect(
        tracks.slice(0, 5).some((track) => /sha[hk]{1,2}zoda|шахзода/i.test(track.artist)),
        query,
      ).toBe(true);
    }
  }, 30_000);

  it("serves the chart fallback and a seeded section", async () => {
    const catalog = createCatalog();
    expect((await catalog.suggestions("trending_here", 10)).length).toBeGreaterThan(0);
    const uz = await catalog.suggestions("uz_hits", 12);
    expect(uz.length).toBeGreaterThanOrEqual(8);
  }, 60_000);

  it("reports which curated seeds resolve against the live catalog", async () => {
    const catalog = createCatalog();
    const unresolved: string[] = [];
    for (const [section, seed] of Object.entries(sectionSeeds)) {
      for (const entry of seed.entries.filter((candidate) => candidate.kind === "track")) {
        const tracks = await catalog.search(entry.query, 3);
        if (tracks.length === 0) unresolved.push(`${section}: ${entry.query}`);
      }
    }
    process.stdout.write(`unresolved seeds: ${unresolved.length}\n${unresolved.join("\n")}\n`);
    expect(unresolved.length).toBeLessThan(10);
  }, 240_000);
});
