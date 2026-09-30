import type { FileStore, SecretStore } from "../../../src/core/environment";

export function createMemoryFiles(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const store: FileStore & { data: Map<string, string> } = {
    data,
    async read(name) {
      return data.get(name) ?? null;
    },
    async write(name, text) {
      data.set(name, text);
    },
  };
  return store;
}

export function createMemorySecrets(available = true) {
  let value: string | null = null;
  const store: SecretStore & { peek(): string | null } = {
    available: () => available,
    async load() {
      return value;
    },
    async save(text) {
      value = text;
    },
    async clear() {
      value = null;
    },
    peek: () => value,
  };
  return store;
}
