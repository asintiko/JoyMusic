export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function browserStorage(): KeyValueStore | null {
  try {
    const store = window.localStorage;
    const probe = "joymusic.admin.probe";
    store.setItem(probe, "1");
    store.removeItem(probe);
    return store;
  } catch {
    return null;
  }
}

export function readValue(store: KeyValueStore | null, key: string): string | null {
  try {
    return store?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeValue(store: KeyValueStore | null, key: string, value: string | null): void {
  try {
    if (value === null) store?.removeItem(key);
    else store?.setItem(key, value);
  } catch {
    return;
  }
}
