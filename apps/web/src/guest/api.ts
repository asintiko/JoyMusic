import type { ApiClient } from "@joymusic/shared";
import { publicApiUrl } from "@/lib/env";
import { loadShared } from "@/lib/shared-runtime";
import { withGuestRetry, type GuestSessionStore } from "./session-store";

interface LazyOptions {
  getToken?: (
    kind: "guest" | "user",
  ) => string | null | undefined | Promise<string | null | undefined>;
  fetch?: typeof fetch;
}

export function createLazyApi(options: LazyOptions = {}): ApiClient {
  let client: Promise<ApiClient> | null = null;
  const resolve = () => {
    client ??= loadShared().then(({ createApiClient }) =>
      createApiClient({ baseUrl: publicApiUrl, ...options }),
    );
    return client;
  };
  const call: ApiClient["call"] = async (name, ...args) => (await resolve()).call(name, ...args);
  return { call };
}

export function createGuestApi(store: GuestSessionStore): ApiClient {
  const client = createLazyApi({
    getToken: async (kind) => {
      if (kind !== "guest") return undefined;
      const session = await store.ensure();
      return session.token;
    },
  });
  return withGuestRetry(client, store);
}

export function createAbortableApi(signal: AbortSignal): ApiClient {
  return createLazyApi({ fetch: (input, init) => fetch(input, { ...init, signal }) });
}
