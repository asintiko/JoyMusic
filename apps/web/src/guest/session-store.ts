import type { ApiClient, Locale } from "@joymusic/shared";
import { isApiError } from "@/lib/api-error";
import { createMemoryStore, type KeyValueStore } from "@/lib/storage";

export interface GuestSession {
  token: string;
  deviceId: string;
  tableLabel: string | null;
  expiresAt: number;
}

export interface GuestSessionStoreOptions {
  slug: string;
  api: Pick<ApiClient, "call">;
  storage: KeyValueStore;
  locale: () => Locale;
  now?: () => number;
  createDeviceId?: () => string;
  refreshMarginMs?: number;
}

export interface GuestSessionStore {
  current(): GuestSession | null;
  ensure(): Promise<GuestSession>;
  refresh(): Promise<GuestSession>;
  invalidate(): void;
  setTableToken(token: string | null): void;
  tableToken(): string | null;
  deviceId(): string;
  subscribe(listener: (session: GuestSession | null) => void): () => void;
}

const deviceKey = "jm:device-id";

export function decodeTokenExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function generateDeviceId(): string {
  const cryptoApi = typeof crypto === "undefined" ? undefined : crypto;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();
  const bytes = new Uint8Array(16);
  if (cryptoApi) cryptoApi.getRandomValues(bytes);
  else for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.random() * 256;
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

interface StoredSession {
  token: string;
  tableLabel: string | null;
  expiresAt: number;
}

function parseStored(raw: string | null): StoredSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof value.token !== "string" || typeof value.expiresAt !== "number") return null;
    return {
      token: value.token,
      tableLabel: typeof value.tableLabel === "string" ? value.tableLabel : null,
      expiresAt: value.expiresAt,
    };
  } catch {
    return null;
  }
}

export function createGuestSessionStore(options: GuestSessionStoreOptions): GuestSessionStore {
  const storage = options.storage ?? createMemoryStore();
  const now = options.now ?? Date.now;
  const margin = options.refreshMarginMs ?? 120_000;
  const sessionKey = `jm:guest:${options.slug}`;
  const tableKey = `jm:table:${options.slug}`;
  const listeners = new Set<(session: GuestSession | null) => void>();
  let session: GuestSession | null = null;
  let pending: Promise<GuestSession> | null = null;
  let scanToken: string | null = null;
  let needsScan = false;

  function deviceId(): string {
    const stored = storage.get(deviceKey);
    if (stored && stored.length >= 8 && stored.length <= 64) return stored;
    const created = (options.createDeviceId ?? generateDeviceId)();
    storage.set(deviceKey, created);
    return created;
  }

  function usable(candidate: GuestSession | null): candidate is GuestSession {
    return candidate !== null && candidate.expiresAt - margin > now();
  }

  function publish(next: GuestSession | null) {
    session = next;
    for (const listener of listeners) listener(next);
  }

  function restore(): GuestSession | null {
    if (usable(session)) return session;
    const stored = parseStored(storage.get(sessionKey));
    if (!stored) return null;
    const restored: GuestSession = { ...stored, deviceId: deviceId() };
    return usable(restored) ? restored : null;
  }

  async function join(): Promise<GuestSession> {
    const id = deviceId();
    const table = needsScan ? (scanToken ?? undefined) : undefined;
    try {
      const result = await options.api.call("guestJoin", {
        params: { slug: options.slug },
        body: { deviceId: id, tableToken: table, locale: options.locale() },
      });
      needsScan = false;
      const expiresAt = decodeTokenExpiry(result.guestToken) ?? now() + 11 * 3_600_000;
      const next: GuestSession = {
        token: result.guestToken,
        deviceId: result.deviceId,
        tableLabel: result.tableLabel,
        expiresAt,
      };
      storage.set(
        sessionKey,
        JSON.stringify({ token: next.token, tableLabel: next.tableLabel, expiresAt }),
      );
      publish(next);
      return next;
    } catch (error) {
      if (isApiError(error) && error.status === 404) storage.remove(sessionKey);
      throw error;
    }
  }

  function run(force: boolean): Promise<GuestSession> {
    if (pending) return pending;
    if (!force && !needsScan) {
      const existing = restore();
      if (existing) {
        if (session !== existing) publish(existing);
        return Promise.resolve(existing);
      }
    }
    const attempt = join().finally(() => {
      pending = null;
    });
    pending = attempt;
    return attempt;
  }

  return {
    current: () => (usable(session) ? session : restore()),
    ensure: () => run(false),
    refresh: () => run(true),
    invalidate() {
      storage.remove(sessionKey);
      publish(null);
    },
    setTableToken(token) {
      if (token) {
        scanToken = token;
        needsScan = true;
        storage.set(tableKey, token);
      } else {
        scanToken = null;
        needsScan = false;
        storage.remove(tableKey);
      }
    },
    tableToken: () => scanToken ?? storage.get(tableKey),
    deviceId,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function withGuestRetry(api: ApiClient, store: GuestSessionStore): ApiClient {
  const call: ApiClient["call"] = async (name, ...args) => {
    try {
      return await api.call(name, ...args);
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        store.invalidate();
        await store.refresh();
        return api.call(name, ...args);
      }
      throw error;
    }
  };
  return { call };
}
