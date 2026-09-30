import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSafeStorageSecretStore } from "../../src/main/file-stores";
import type { SafeStorageLike } from "../../src/main/file-stores";

function fakeSafeStorage(overrides: Partial<SafeStorageLike> = {}): SafeStorageLike {
  return {
    isEncryptionAvailable: () => true,
    encryptString: (plain) => Buffer.from(`enc:${Buffer.from(plain).toString("base64")}`),
    decryptString: (encrypted) => {
      const text = encrypted.toString();
      if (!text.startsWith("enc:")) throw new Error("bad ciphertext");
      return Buffer.from(text.slice(4), "base64").toString();
    },
    getSelectedStorageBackend: () => "gnome_libsecret",
    ...overrides,
  };
}

describe("token store", () => {
  let directory = "";

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "joy-token-"));
  });

  afterEach(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  it("round-trips a session through the encrypted file", async () => {
    const store = createSafeStorageSecretStore({ directory, safeStorage: fakeSafeStorage() });
    await store.save(JSON.stringify({ refreshToken: "secret-refresh-token" }));
    expect(await store.load()).toBe(JSON.stringify({ refreshToken: "secret-refresh-token" }));
  });

  it("never writes the plain token to disk", async () => {
    const store = createSafeStorageSecretStore({ directory, safeStorage: fakeSafeStorage() });
    await store.save("secret-refresh-token");
    const raw = await readFile(join(directory, "session.bin"));
    expect(raw.toString()).not.toContain("secret-refresh-token");
  });

  it("refuses to persist when the OS cannot encrypt", async () => {
    const store = createSafeStorageSecretStore({
      directory,
      safeStorage: fakeSafeStorage({ isEncryptionAvailable: () => false }),
    });
    expect(store.available()).toBe(false);
    await expect(store.save("x")).rejects.toThrow("Secure storage is not available");
    expect(await store.load()).toBeNull();
  });

  it("treats the weak basic_text Linux backend as unavailable", () => {
    const store = createSafeStorageSecretStore({
      directory,
      safeStorage: fakeSafeStorage({ getSelectedStorageBackend: () => "basic_text" }),
    });
    expect(store.available()).toBe(false);
  });

  it("drops a corrupt file instead of throwing", async () => {
    const store = createSafeStorageSecretStore({ directory, safeStorage: fakeSafeStorage() });
    await writeFile(join(directory, "session.bin"), "garbage");
    expect(await store.load()).toBeNull();
    expect(await store.load()).toBeNull();
  });

  it("clears the stored session", async () => {
    const store = createSafeStorageSecretStore({ directory, safeStorage: fakeSafeStorage() });
    await store.save("value");
    await store.clear();
    expect(await store.load()).toBeNull();
  });
});
