import { describe, expect, it, vi } from "vitest";
import { createSession, organizationStorageKey, refreshStorageKey } from "../src/lib/session";
import { authFixture, errorResponse, jsonResponse, meFixture, memoryStore } from "./helpers";

const base = "http://api.test";

function setup(
  handler: (url: string, init: RequestInit) => Response | Promise<Response>,
  store = memoryStore(),
) {
  const calls: Array<{ url: string; init: RequestInit; auth: string | null; org: string | null }> =
    [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const headers = new Headers(init?.headers);
    calls.push({
      url,
      init: init ?? {},
      auth: headers.get("authorization"),
      org: headers.get("x-organization-id"),
    });
    return handler(url, init ?? {});
  });
  let clock = 1_000_000;
  const session = createSession({
    baseUrl: base,
    fetch: fetchMock as unknown as typeof fetch,
    storage: store,
    now: () => clock,
  });
  return { session, calls, store, advance: (ms: number) => (clock += ms), fetchMock };
}

function bearer(init: RequestInit): string | null {
  return new Headers(init.headers).get("authorization");
}

describe("session", () => {
  it("stays anonymous without a stored refresh token", async () => {
    const { session, calls } = setup(() => jsonResponse({}));
    const snapshot = await session.bootstrap();
    expect(snapshot.status).toBe("anonymous");
    expect(calls).toHaveLength(0);
  });

  it("restores the session from the refresh token and rotates it", async () => {
    const { session, store } = setup(
      (url) => {
        if (url.endsWith("/v1/auth/refresh")) {
          return jsonResponse({ accessToken: "a2", refreshToken: "r2", expiresIn: 900 });
        }
        if (url.endsWith("/v1/me")) return jsonResponse(meFixture);
        return errorResponse(404, "not_found");
      },
      memoryStore({ [refreshStorageKey]: "r1" }),
    );
    const snapshot = await session.bootstrap();
    expect(snapshot.status).toBe("authenticated");
    expect(snapshot.role).toBe("owner");
    expect(store.getItem(refreshStorageKey)).toBe("r2");
    expect(store.getItem(organizationStorageKey)).toBe("org_1");
  });

  it("clears credentials when the refresh token is rejected", async () => {
    const { session, store } = setup(
      () => errorResponse(401, "unauthorized"),
      memoryStore({ [refreshStorageKey]: "stale" }),
    );
    const snapshot = await session.bootstrap();
    expect(snapshot.status).toBe("anonymous");
    expect(store.getItem(refreshStorageKey)).toBeNull();
  });

  it("keeps the refresh token when the network fails", async () => {
    const { session, store } = setup(
      () => {
        throw new TypeError("offline");
      },
      memoryStore({ [refreshStorageKey]: "keep" }),
    );
    await session.bootstrap();
    expect(store.getItem(refreshStorageKey)).toBe("keep");
  });

  it("refreshes once for many concurrent expired requests", async () => {
    let refreshCount = 0;
    const { session, calls, advance } = setup((url, init) => {
      if (url.endsWith("/v1/auth/refresh")) {
        refreshCount += 1;
        return jsonResponse({
          accessToken: `a${refreshCount + 1}`,
          refreshToken: `r${refreshCount + 1}`,
          expiresIn: 900,
        });
      }
      if (url.endsWith("/v1/admin/venues")) {
        return bearer(init) === "Bearer a2"
          ? jsonResponse({ venues: [] })
          : errorResponse(401, "unauthorized");
      }
      return errorResponse(404, "not_found");
    });
    session.signIn(authFixture({ accessToken: "a1", refreshToken: "r1", expiresIn: 60 }));
    advance(120_000);
    const results = await Promise.all([
      session.api.call("adminVenues"),
      session.api.call("adminVenues"),
      session.api.call("adminVenues"),
    ]);
    expect(results.every((entry) => entry.venues.length === 0)).toBe(true);
    expect(refreshCount).toBe(1);
    expect(calls.filter((entry) => entry.url.endsWith("/v1/auth/refresh"))).toHaveLength(1);
  });

  it("retries a 401 once with the rotated token", async () => {
    let refreshCount = 0;
    const { session, calls } = setup((url, init) => {
      if (url.endsWith("/v1/auth/refresh")) {
        refreshCount += 1;
        return jsonResponse({ accessToken: "fresh", refreshToken: "r-next", expiresIn: 900 });
      }
      if (url.endsWith("/v1/admin/members")) {
        return bearer(init) === "Bearer fresh"
          ? jsonResponse({ members: [] })
          : errorResponse(401, "unauthorized");
      }
      return errorResponse(404, "not_found");
    });
    session.signIn(authFixture());
    const result = await session.api.call("adminMembers");
    expect(result.members).toEqual([]);
    expect(refreshCount).toBe(1);
    expect(calls.map((entry) => entry.auth)).toEqual(["Bearer access-1", null, "Bearer fresh"]);
  });

  it("signs out locally when the retry is still unauthorized", async () => {
    const { session, store } = setup((url) => {
      if (url.endsWith("/v1/auth/refresh")) {
        return jsonResponse({ accessToken: "fresh", refreshToken: "r-next", expiresIn: 900 });
      }
      return errorResponse(401, "unauthorized");
    });
    session.signIn(authFixture());
    await expect(session.api.call("adminVenues")).rejects.toMatchObject({ status: 401 });
    expect(session.getSnapshot().status).toBe("anonymous");
    expect(store.getItem(refreshStorageKey)).toBeNull();
  });

  it("sends the organization header only to admin routes", async () => {
    const { session, calls } = setup((url) => {
      if (url.endsWith("/v1/me")) return jsonResponse(meFixture);
      return jsonResponse({ venues: [] });
    });
    session.signIn(authFixture());
    await session.api.call("adminVenues");
    await session.api.call("me");
    const [admin, me] = calls;
    expect(admin?.org).toBe("org_1");
    expect(me?.org).toBeNull();
  });

  it("logs out by revoking the refresh token and clearing storage", async () => {
    const { session, store, calls } = setup(() => jsonResponse({ ok: true }));
    session.signIn(authFixture());
    await session.signOut();
    expect(session.getSnapshot().status).toBe("anonymous");
    expect(store.getItem(refreshStorageKey)).toBeNull();
    expect(calls[0]?.url).toBe(`${base}/v1/auth/logout`);
    expect(JSON.parse(String(calls[0]?.init.body))).toEqual({ refreshToken: "refresh-1" });
  });

  it("reacts to a logout in another tab", () => {
    const { session } = setup(() => jsonResponse({}));
    session.signIn(authFixture());
    session.handleStorageEvent({ key: refreshStorageKey, newValue: null });
    expect(session.getSnapshot().status).toBe("anonymous");
  });

  it("ignores organizations the user does not belong to", () => {
    const { session } = setup(() => jsonResponse({}));
    session.signIn(authFixture());
    session.setActiveOrganization("org_other");
    expect(session.getSnapshot().activeOrganizationId).toBe("org_1");
  });
});
