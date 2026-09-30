import type { BrowserContext } from "@playwright/test";
import type { Track } from "@joymusic/shared";

const catalog: Array<[string, string]> = [
  ["Shahzoda", "Yomgir"],
  ["Shahzoda", "Billionaire"],
  ["Shahzoda", "Habibi"],
  ["Shahzoda", "Maqtanchoq"],
  ["Ozoda", "Tasalli ber"],
  ["Dua Lipa", "Levitating"],
  ["The Weeknd", "Blinding Lights"],
  ["Daft Punk", "One More Time"],
  ["Laylo", "Kechqurun"],
  ["Timur Soul", "Yulduzlar"],
];

export function stubTracks(query: string): Track[] {
  const needle = query.toLowerCase();
  return catalog
    .map(([artist, title], index): Track => ({
      id: `deezer:e2e-${index + 1}`,
      source: "deezer",
      sourceId: `e2e-${index + 1}`,
      title,
      artist,
      album: null,
      artworkUrl: null,
      previewUrl: null,
      durationSec: 200 + index,
      explicit: false,
    }))
    .filter((track) => `${track.artist} ${track.title}`.toLowerCase().includes(needle));
}

export async function stubCatalog(context: BrowserContext, origin: string): Promise<void> {
  await context.route("**/v1/catalog/search**", async (route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get("q") ?? "";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": origin },
      body: JSON.stringify({ tracks: stubTracks(query) }),
    });
  });
}
