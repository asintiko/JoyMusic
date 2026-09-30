import type { DeckState } from "./types";

function recency(deck: DeckState): number {
  return deck.loadedAt ?? deck.track?.startedAt ?? 0;
}

function byPreference(a: DeckState, b: DeckState): number {
  const playingA = a.playing === true ? 1 : 0;
  const playingB = b.playing === true ? 1 : 0;
  if (playingA !== playingB) return playingB - playingA;
  const recent = recency(b) - recency(a);
  if (recent !== 0) return recent;
  return a.deck.localeCompare(b.deck);
}

export function selectOnAirDeck(decks: readonly DeckState[]): DeckState | null {
  const loaded = decks.filter((deck) => deck.track !== null);
  if (loaded.length === 0) return null;
  const onAir = loaded.filter((deck) => deck.onAir === true);
  if (onAir.length > 0) return [...onAir].sort(byPreference)[0] ?? null;
  const unknown = loaded.filter((deck) => deck.onAir === undefined);
  if (unknown.length === 0) return null;
  const playing = unknown.filter((deck) => deck.playing !== false);
  const pool = playing.length > 0 ? playing : unknown;
  return [...pool].sort(byPreference)[0] ?? null;
}
