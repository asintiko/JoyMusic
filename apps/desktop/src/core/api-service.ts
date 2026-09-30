import { ApiError, createApiClient, routes } from "@joymusic/shared";
import type { RouteName } from "@joymusic/shared";
import type { AuthService } from "./auth-service";
import { createGuardedFetch } from "./auth-service";
import type { Connectivity } from "./connectivity";
import type { CoreEnvironment } from "./environment";
import { NetworkFailure } from "./errors";

type Client = ReturnType<typeof createApiClient>;
type Call = Client["call"];

export function isTransientFailure(error: unknown): boolean {
  if (error instanceof NetworkFailure) return true;
  return error instanceof ApiError && (error.status >= 500 || error.status === 429);
}

export function createApiService(
  env: CoreEnvironment,
  auth: AuthService,
  connectivity: Connectivity,
) {
  const client = createApiClient({
    baseUrl: env.config.apiUrl,
    fetch: createGuardedFetch(env),
    getToken: async (kind) => (kind === "user" ? auth.getAccessToken() : null),
  });

  const call = (async (name: RouteName, ...args: unknown[]) => {
    const invoke = () =>
      (client.call as (name: RouteName, ...args: unknown[]) => Promise<unknown>)(name, ...args);
    const epoch = connectivity.epoch();
    try {
      const result = await invoke().catch(async (error: unknown) => {
        const needsUser = routes[name].auth === "user";
        if (error instanceof ApiError && error.status === 401 && needsUser && auth.hasSession()) {
          await auth.refresh();
          return invoke();
        }
        throw error;
      });
      connectivity.reportSuccess(epoch);
      return result;
    } catch (error) {
      if (error instanceof NetworkFailure) connectivity.reportFailure();
      throw error;
    }
  }) as Call;

  return { call };
}

export type ApiService = ReturnType<typeof createApiService>;
