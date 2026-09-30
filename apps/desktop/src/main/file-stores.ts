import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FileStore, SecretStore } from "../core/environment";

const safeName = /^[a-z0-9][a-z0-9._-]{0,63}$/u;

function isMissing(error: unknown): boolean {
  return (error as { code?: string } | null)?.code === "ENOENT";
}

export function createDiskFileStore(directory: string): FileStore {
  const resolve = (name: string) => {
    if (!safeName.test(name)) throw new Error(`Invalid file name: ${name}`);
    return join(directory, name);
  };
  return {
    async read(name) {
      try {
        return await readFile(resolve(name), "utf8");
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
    async write(name, text) {
      const target = resolve(name);
      const temporary = `${target}.${process.pid}.tmp`;
      await mkdir(directory, { recursive: true });
      await writeFile(temporary, text, { encoding: "utf8", mode: 0o600 });
      await rename(temporary, target);
    },
  };
}

export interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(plain: string): Buffer;
  decryptString(encrypted: Buffer): string;
  getSelectedStorageBackend?(): string;
}

export interface SecretStoreOptions {
  directory: string;
  safeStorage: SafeStorageLike;
  fileName?: string;
}

export function createSafeStorageSecretStore(options: SecretStoreOptions): SecretStore {
  const target = join(options.directory, options.fileName ?? "session.bin");
  const { safeStorage } = options;
  const available = () => {
    if (!safeStorage.isEncryptionAvailable()) return false;
    return safeStorage.getSelectedStorageBackend?.() !== "basic_text";
  };
  return {
    available,
    async load() {
      if (!available()) return null;
      let encrypted: Buffer;
      try {
        encrypted = await readFile(target);
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
      try {
        return safeStorage.decryptString(encrypted);
      } catch {
        await rm(target, { force: true });
        return null;
      }
    },
    async save(text) {
      if (!available()) throw new Error("Secure storage is not available");
      await mkdir(options.directory, { recursive: true });
      const temporary = `${target}.${process.pid}.tmp`;
      await writeFile(temporary, safeStorage.encryptString(text), { mode: 0o600 });
      await rename(temporary, target);
    },
    async clear() {
      await rm(target, { force: true });
    },
  };
}
