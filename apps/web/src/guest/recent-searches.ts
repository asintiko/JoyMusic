import { readJson, writeJson, type KeyValueStore } from "@/lib/storage";

const key = "jm:recent-searches";
const limit = 8;

export function loadRecent(store: KeyValueStore): string[] {
  const value = readJson<unknown>(store, key, []);
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string").slice(0, limit);
}

export function pushRecent(store: KeyValueStore, query: string): string[] {
  const clean = query.trim().replace(/\s+/g, " ");
  if (clean.length < 2) return loadRecent(store);
  const lower = clean.toLocaleLowerCase();
  const next = [
    clean,
    ...loadRecent(store).filter((entry) => entry.toLocaleLowerCase() !== lower),
  ].slice(0, limit);
  writeJson(store, key, next);
  return next;
}

export function clearRecent(store: KeyValueStore): string[] {
  store.remove(key);
  return [];
}
