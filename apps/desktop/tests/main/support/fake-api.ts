export interface RecordedCall {
  method: string;
  path: string;
  body: unknown;
  authorization: string | null;
}

export interface FakeApiOptions {
  now?: () => number;
}

export interface FakeApi {
  fetch: typeof fetch;
  calls: RecordedCall[];
  offline: boolean;
  failWith: ((call: RecordedCall) => Response | null) | null;
  refreshDelayMs: number;
  desktopChallenge: string | null;
  callsTo(path: string): RecordedCall[];
}

const me = {
  user: {
    id: "usr_1",
    email: "dj@joymusic.uz",
    name: "DJ Rustam",
    avatarUrl: null,
    locale: "uz",
  },
  memberships: [{ organizationId: "org_1", organizationName: "Joy Demo", role: "dj" }],
  isPlatformAdmin: false,
};

const now = "2026-09-30T10:00:00.000Z";

function requestItem(id: string, status: string) {
  return {
    id,
    sessionId: "ses_1",
    venueId: "ven_1",
    track: null,
    freeText: { artist: "Artist", title: "Title" },
    title: "Title",
    artist: "Artist",
    artworkUrl: null,
    note: null,
    dedicatedTo: null,
    tableLabel: null,
    votes: 1,
    status,
    declineReason: null,
    position: null,
    mine: false,
    createdAt: now,
    updatedAt: now,
  };
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function errorBody(status: number, code: string, message: string): Response {
  return json(status, { error: { code, message } });
}

export function createFakeApi(): FakeApi {
  let tokenCounter = 0;
  const validRefresh = new Set<string>();
  const api: FakeApi = {
    calls: [],
    offline: false,
    failWith: null,
    refreshDelayMs: 0,
    desktopChallenge: null,
    callsTo(path) {
      return api.calls.filter((call) => call.path === path);
    },
    fetch: (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (api.offline) throw new TypeError("fetch failed");
      const url = new URL(
        typeof input === "string" ? input : input instanceof URL ? input.href : input.url,
      );
      const headers = new Headers(init?.headers);
      const call: RecordedCall = {
        method: init?.method ?? "GET",
        path: url.pathname,
        body: init?.body ? JSON.parse(String(init.body)) : null,
        authorization: headers.get("authorization"),
      };
      api.calls.push(call);
      const forced = api.failWith?.(call);
      if (forced) return forced;

      const issue = () => {
        tokenCounter += 1;
        const refreshToken = `refresh-${tokenCounter}`;
        validRefresh.add(refreshToken);
        return {
          accessToken: `access-${tokenCounter}`,
          refreshToken,
          expiresIn: 900,
        };
      };

      switch (`${call.method} ${call.path}`) {
        case "GET /v1/health":
          return json(200, { status: "ok", time: new Date().toISOString() });
        case "POST /v1/auth/login": {
          const body = call.body as { password?: string };
          if (body.password !== "joymusic-demo") {
            return errorBody(401, "invalid_credentials", "Invalid email or password");
          }
          return json(200, { ...issue(), me });
        }
        case "POST /v1/auth/refresh": {
          if (api.refreshDelayMs > 0) {
            await new Promise((resolve) => setTimeout(resolve, api.refreshDelayMs));
          }
          const body = call.body as { refreshToken?: string };
          if (!body.refreshToken || !validRefresh.has(body.refreshToken)) {
            return errorBody(401, "unauthorized", "Refresh token revoked");
          }
          validRefresh.delete(body.refreshToken);
          return json(200, issue());
        }
        case "GET /v1/catalog/search":
          return json(200, { tracks: [] });
        case "POST /v1/auth/logout":
          return json(200, { ok: true });
        case "POST /v1/auth/desktop/token": {
          const body = call.body as { code?: string; codeVerifier?: string };
          if (body.code !== "one-time-code")
            return errorBody(401, "invalid_credentials", "Bad code");
          api.desktopChallenge = body.codeVerifier ?? null;
          return json(200, { ...issue(), me });
        }
        default: {
          const action = /^\/v1\/dj\/requests\/([^/]+)\/(accept|decline|play|played)$/u.exec(
            call.path,
          );
          if (action) {
            const statuses: Record<string, string> = {
              accept: "accepted",
              decline: "declined",
              play: "playing",
              played: "played",
            };
            return json(200, requestItem(action[1] ?? "", statuses[action[2] ?? ""] ?? "pending"));
          }
          if (call.method === "PUT" && /\/nowplaying$/u.test(call.path)) {
            const body = call.body as Record<string, unknown>;
            return json(200, {
              title: body.title,
              artist: body.artist ?? "",
              artworkUrl: body.artworkUrl ?? null,
              track: null,
              startedAt: body.startedAt ?? now,
              durationSec: body.durationSec ?? null,
              bpm: body.bpm ?? null,
              key: body.key ?? null,
              source: body.source ?? "manual",
              requestId: null,
              dedicatedTo: null,
            });
          }
          if (call.path.startsWith("/v1/dj/")) return json(200, { ok: true });
          return errorBody(404, "not_found", "Unknown route");
        }
      }
    }) as typeof fetch,
  };
  return api;
}
