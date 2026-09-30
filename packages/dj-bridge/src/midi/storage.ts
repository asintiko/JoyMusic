import { isValidAction, isValidMatch } from "./actions";
import type { BindingStorage, MidiBinding, MidiLed } from "./types";

const storageVersion = 1;

export function serializeBindings(bindings: readonly MidiBinding[]): string {
  return JSON.stringify({ version: storageVersion, bindings });
}

function validLed(value: unknown): value is MidiLed {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return isValidMatch(candidate);
}

export interface ParsedBindings {
  bindings: MidiBinding[];
  skipped: number;
}

export function parseBindings(json: string): ParsedBindings {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { bindings: [], skipped: 0 };
  }
  const list = (raw as { bindings?: unknown } | null)?.bindings;
  if (!Array.isArray(list)) return { bindings: [], skipped: 0 };
  const bindings: MidiBinding[] = [];
  let skipped = 0;
  for (const item of list as unknown[]) {
    const candidate = item as Record<string, unknown> | null;
    if (!candidate || !isValidMatch(candidate.match) || !isValidAction(candidate.action)) {
      skipped += 1;
      continue;
    }
    const binding: MidiBinding = { match: candidate.match, action: candidate.action };
    if (candidate.relative === true) binding.relative = true;
    if (candidate.led === null) binding.led = null;
    else if (validLed(candidate.led)) binding.led = candidate.led;
    bindings.push(binding);
  }
  return { bindings, skipped };
}

export function createMemoryBindingStorage(initial: string | null = null): BindingStorage {
  let value = initial;
  return {
    load: async () => value,
    save: async (json) => {
      value = json;
    },
  };
}

export interface KeyValueStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function createKeyValueBindingStorage(
  storage: KeyValueStorageLike,
  key = "joymusic.midi.bindings",
): BindingStorage {
  return {
    load: async () => storage.getItem(key),
    save: async (json) => {
      storage.setItem(key, json);
    },
  };
}
