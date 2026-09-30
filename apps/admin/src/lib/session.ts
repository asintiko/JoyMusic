import {
  ApiError,
  createApiClient,
  type ApiClient,
  type AuthResult,
  type AuthTokens,
  type Me,
  type MemberRole,
} from "@joymusic/shared";
import { membershipFor, pickActiveOrganization } from "./permissions";
import { readValue, writeValue, type KeyValueStore } from "./storage";

export type SessionStatus = "booting" | "anonymous" | "authenticated";

export interface SessionSnapshot {
  status: SessionStatus;
  me: Me | null;
  activeOrganizationId: string | null;
  role: MemberRole | null;
}

export interface LockProvider {
  request<T>(name: string, callback: () => Promise<T>): Promise<T>;
}

export interface SessionOptions {
  baseUrl: string;
  fetch?: typeof fetch;
  storage?: KeyValueStore | null;
  locks?: LockProvider | null;
  now?: () => number;
  leewayMs?: number;
}

export const refreshStorageKey = "joymusic.admin.refresh";
export const organizationStorageKey = "joymusic.admin.organization";
const refreshLockName = "joymusic-admin-refresh";
const defaultLeewayMs = 20_000;

function isRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.status === 400 || error.status === 401 || error.status === 403)
  );
}

function organizationScoped(url: string, baseUrl: string): boolean {
  const path = url.startsWith(baseUrl) ? url.slice(baseUrl.length) : url;
  return path.startsWith("/v1/admin/");
}

export function browserLocks(): LockProvider | null {
  const manager = typeof navigator === "undefined" ? undefined : navigator.locks;
  if (!manager) return null;
  return { request: (name, callback) => manager.request(name, callback) };
}

export function createSession(options: SessionOptions) {
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const fetchImpl = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const storage = options.storage ?? null;
  const locks = options.locks ?? null;
  const now = options.now ?? Date.now;
  const leewayMs = options.leewayMs ?? defaultLeewayMs;

  let accessToken: string | null = null;
  let accessExpiresAt = 0;
  let snapshot: SessionSnapshot = {
    status: "booting",
    me: null,
    activeOrganizationId: null,
    role: null,
  };
  let inflightRefresh: Promise<boolean> | null = null;
  let bootstrapPromise: Promise<SessionSnapshot> | null = null;
  const listeners = new Set<() => void>();

  const publicClient = createApiClient({ baseUrl, fetch: fetchImpl, validateResponses: true });

  function emit(next: SessionSnapshot) {
    snapshot = next;
    listeners.forEach((listener) => listener());
  }

  function setSnapshot(
    me: Me | null,
    status: SessionStatus,
    preferredOrganization?: string | null,
  ) {
    if (!me || status !== "authenticated") {
      emit({ status, me: null, activeOrganizationId: null, role: null });
      return;
    }
    const preferred =
      preferredOrganization ??
      snapshot.activeOrganizationId ??
      readValue(storage, organizationStorageKey);
    const activeOrganizationId = pickActiveOrganization(me, preferred);
    writeValue(storage, organizationStorageKey, activeOrganizationId);
    emit({
      status,
      me,
      activeOrganizationId,
      role: membershipFor(me, activeOrganizationId)?.role ?? null,
    });
  }

  function applyTokens(tokens: AuthTokens) {
    accessToken = tokens.accessToken;
    accessExpiresAt = now() + tokens.expiresIn * 1000;
    writeValue(storage, refreshStorageKey, tokens.refreshToken);
  }

  function dropCredentials() {
    accessToken = null;
    accessExpiresAt = 0;
    writeValue(storage, refreshStorageKey, null);
  }

  function expire() {
    dropCredentials();
    setSnapshot(null, "anonymous");
  }

  async function performRefresh(): Promise<boolean> {
    const token = readValue(storage, refreshStorageKey);
    if (!token) {
      dropCredentials();
      return false;
    }
    try {
      const tokens = await publicClient.call("authRefresh", { body: { refreshToken: token } });
      applyTokens(tokens);
      return true;
    } catch (error) {
      if (isRejection(error)) {
        dropCredentials();
        return false;
      }
      throw error;
    }
  }

  function refresh(): Promise<boolean> {
    if (!inflightRefresh) {
      const run = locks ? locks.request(refreshLockName, performRefresh) : performRefresh();
      inflightRefresh = run.finally(() => {
        inflightRefresh = null;
      });
    }
    return inflightRefresh;
  }

  async function getAccessToken(): Promise<string | null> {
    if (accessToken && accessExpiresAt - now() > leewayMs) return accessToken;
    if (!readValue(storage, refreshStorageKey) && !accessToken) return null;
    const refreshed = await refresh().catch(() => false);
    return refreshed ? accessToken : null;
  }

  const authorizedFetch: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers);
    const organizationId = snapshot.activeOrganizationId;
    if (organizationId && organizationScoped(url, baseUrl)) {
      headers.set("x-organization-id", organizationId);
    }
    const response = await fetchImpl(input, { ...init, headers });
    if (response.status !== 401 || !headers.has("authorization")) return response;
    const refreshed = await refresh().catch(() => false);
    if (!refreshed || !accessToken) return response;
    headers.set("authorization", `Bearer ${accessToken}`);
    return fetchImpl(input, { ...init, headers });
  };

  const api: ApiClient = createApiClient({
    baseUrl,
    fetch: authorizedFetch,
    getToken: (kind) => (kind === "user" ? getAccessToken() : null),
    onUnauthorized: (kind) => {
      if (kind === "user" && snapshot.status === "authenticated") expire();
    },
  });

  function bootstrap(): Promise<SessionSnapshot> {
    if (!bootstrapPromise) {
      bootstrapPromise = (async () => {
        if (!readValue(storage, refreshStorageKey)) {
          setSnapshot(null, "anonymous");
          return snapshot;
        }
        try {
          const refreshed = await refresh();
          if (!refreshed) {
            setSnapshot(null, "anonymous");
            return snapshot;
          }
          const me = await api.call("me");
          setSnapshot(me, "authenticated");
        } catch {
          setSnapshot(null, "anonymous");
        }
        return snapshot;
      })();
    }
    return bootstrapPromise;
  }

  function signIn(result: AuthResult) {
    applyTokens(result);
    setSnapshot(result.me, "authenticated");
    bootstrapPromise = Promise.resolve(snapshot);
  }

  async function signOut() {
    const token = readValue(storage, refreshStorageKey);
    dropCredentials();
    setSnapshot(null, "anonymous");
    if (token)
      await publicClient
        .call("authLogout", { body: { refreshToken: token } })
        .catch(() => undefined);
  }

  async function reloadMe() {
    const me = await api.call("me");
    setSnapshot(me, "authenticated");
    return me;
  }

  function setActiveOrganization(organizationId: string) {
    if (!snapshot.me || !membershipFor(snapshot.me, organizationId)) return;
    setSnapshot(snapshot.me, "authenticated", organizationId);
  }

  function handleStorageEvent(event: { key: string | null; newValue: string | null }) {
    if (
      event.key === refreshStorageKey &&
      event.newValue === null &&
      snapshot.status === "authenticated"
    ) {
      dropCredentials();
      setSnapshot(null, "anonymous");
    }
  }

  return {
    api,
    publicClient,
    bootstrap,
    signIn,
    signOut,
    refresh,
    reloadMe,
    setActiveOrganization,
    getAccessToken,
    handleStorageEvent,
    expire,
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type Session = ReturnType<typeof createSession>;
