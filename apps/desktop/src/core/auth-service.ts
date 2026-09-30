import { ApiError, createApiClient, meSchema } from "@joymusic/shared";
import type { AuthResult, Me } from "@joymusic/shared";
import { z } from "zod";
import { signedOutAuthState } from "../common/bridge";
import type { AuthState } from "../common/bridge";
import type { DeepLink } from "./deep-link";
import type { CoreEnvironment } from "./environment";
import { NetworkFailure } from "./errors";
import {
  buildAuthorizeUrl,
  createCodeChallenge,
  createCodeVerifier,
  createState,
  statesMatch,
} from "./pkce";
import { createTopic } from "./topic";

const storedSessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  expiresAt: z.number(),
  me: meSchema,
});
type StoredSession = z.infer<typeof storedSessionSchema>;

interface PendingBrowserLogin {
  verifier: string;
  state: string;
  expiresAt: number;
}

const refreshMarginMs = 30_000;
const browserLoginTtlMs = 5 * 60_000;

export function createGuardedFetch(env: Pick<CoreEnvironment, "fetch" | "requestTimeoutMs">) {
  const timeoutMs = env.requestTimeoutMs ?? 10_000;
  const guarded: typeof fetch = async (input, init) => {
    try {
      return await env.fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      throw new NetworkFailure(error instanceof Error ? error.message : "Network unavailable", {
        cause: error,
      });
    }
  };
  return guarded;
}

export function createAuthService(env: CoreEnvironment) {
  const topic = createTopic<AuthState>(signedOutAuthState);
  const plain = createApiClient({
    baseUrl: env.config.apiUrl,
    fetch: createGuardedFetch(env),
  });
  let session: StoredSession | null = null;
  let pending: PendingBrowserLogin | null = null;
  let refreshing: Promise<string> | null = null;

  const publish = (patch: Partial<AuthState>) => {
    topic.update((current) => ({
      ...current,
      status: session ? "signedIn" : "signedOut",
      me: session?.me ?? null,
      browserLoginPending: pending !== null,
      ...patch,
    }));
  };

  const persist = async () => {
    if (!env.secrets.available()) return;
    try {
      if (session) await env.secrets.save(JSON.stringify(session));
      else await env.secrets.clear();
    } catch {
      return;
    }
  };

  const adopt = async (result: AuthResult) => {
    session = {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresAt: env.now() + result.expiresIn * 1000,
      me: result.me,
    };
    pending = null;
    await persist();
    publish({ error: null, restored: true });
  };

  const signOutLocal = async (error: string | null) => {
    session = null;
    pending = null;
    refreshing = null;
    await persist();
    publish({ error });
  };

  const doRefresh = async (): Promise<string> => {
    const current = session;
    if (!current) throw new ApiError(401, "unauthorized", "Not signed in");
    try {
      const tokens = await plain.call("authRefresh", {
        body: { refreshToken: current.refreshToken },
      });
      if (session !== current) throw new ApiError(401, "unauthorized", "Signed out");
      session = {
        ...current,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: env.now() + tokens.expiresIn * 1000,
      };
      await persist();
      return tokens.accessToken;
    } catch (error) {
      if (error instanceof ApiError && session === current && [401, 403].includes(error.status)) {
        await signOutLocal("session_expired");
      }
      throw error;
    }
  };

  const refresh = (): Promise<string> => {
    if (!refreshing) {
      refreshing = doRefresh().finally(() => {
        refreshing = null;
      });
    }
    return refreshing;
  };

  return {
    topic,
    hasSession: () => session !== null,
    currentMe: (): Me | null => session?.me ?? null,
    async restore() {
      if (!env.secrets.available()) {
        publish({ restored: true });
        return;
      }
      try {
        const text = await env.secrets.load();
        const parsed = text ? storedSessionSchema.safeParse(JSON.parse(text)) : null;
        if (parsed?.success) session = parsed.data;
      } catch {
        session = null;
      }
      publish({ restored: true, error: null });
    },
    async getAccessToken(): Promise<string | null> {
      const current = session;
      if (!current) return null;
      if (current.expiresAt - env.now() > refreshMarginMs) return current.accessToken;
      try {
        return await refresh();
      } catch (error) {
        if (error instanceof NetworkFailure && current.expiresAt > env.now()) {
          return current.accessToken;
        }
        throw error;
      }
    },
    refresh,
    async loginWithPassword(email: string, password: string): Promise<AuthState> {
      const result = await plain.call("authLogin", { body: { email, password } });
      await adopt(result);
      return topic.get();
    },
    async beginBrowserLogin(): Promise<{ url: string }> {
      const verifier = createCodeVerifier();
      const state = createState();
      const challenge = await createCodeChallenge(verifier);
      pending = { verifier, state, expiresAt: env.now() + browserLoginTtlMs };
      const url = buildAuthorizeUrl(env.config.adminUrl, state, challenge);
      publish({ error: null });
      try {
        await env.openExternal(url);
      } catch (error) {
        pending = null;
        publish({});
        throw error;
      }
      return { url };
    },
    cancelBrowserLogin() {
      pending = null;
      publish({});
    },
    async handleDeepLink(link: DeepLink): Promise<void> {
      const waiting = pending;
      if (link.kind === "authError") {
        if (waiting && (link.state === null || statesMatch(waiting.state, link.state))) {
          pending = null;
          publish({ error: link.error });
        }
        return;
      }
      if (!waiting || env.now() > waiting.expiresAt || !statesMatch(waiting.state, link.state)) {
        publish({ error: "invalid_state" });
        return;
      }
      pending = null;
      try {
        const result = await plain.call("authDesktopToken", {
          body: { code: link.code, codeVerifier: waiting.verifier },
        });
        await adopt(result);
      } catch (error) {
        publish({
          error:
            error instanceof ApiError
              ? error.code
              : error instanceof NetworkFailure
                ? "network"
                : "internal",
        });
      }
    },
    async logout(): Promise<void> {
      const current = session;
      await signOutLocal(null);
      if (current) {
        try {
          await plain.call("authLogout", { body: { refreshToken: current.refreshToken } });
        } catch {
          return;
        }
      }
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
