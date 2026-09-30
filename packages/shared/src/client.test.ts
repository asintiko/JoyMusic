import { describe, expect, it, vi } from "vitest";
import { ApiError, createApiClient } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("createApiClient", () => {
  it("fills path params, serialises query and attaches the guest token", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      jsonResponse({ tracks: [] }),
    );
    const client = createApiClient({
      baseUrl: "https://api.example.com/",
      fetch: fetchMock as unknown as typeof fetch,
      getToken: () => "guest-token",
    });
    await client.call("catalogSearch", { query: { q: "shahzoda", limit: 5 } });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.example.com/v1/catalog/search?q=shahzoda&limit=5");
    expect(init?.method).toBe("GET");
  });

  it("sends json bodies and bearer tokens for authenticated routes", async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      jsonResponse({ ok: true }),
    );
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetch: fetchMock as unknown as typeof fetch,
      getToken: (kind) => (kind === "user" ? "user-token" : null),
    });
    await client.call("djQueueReorder", {
      params: { sessionId: "s 1" },
      body: { order: ["a", "b"] },
    });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(String(url)).toBe("https://api.example.com/v1/dj/sessions/s%201/queue");
    const headers = init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer user-token");
    expect(JSON.parse(String(init?.body))).toEqual({ order: ["a", "b"] });
  });

  it("turns error responses into ApiError and reports unauthorized", async () => {
    const onUnauthorized = vi.fn();
    const client = createApiClient({
      baseUrl: "https://api.example.com",
      fetch: (async () =>
        jsonResponse(
          { error: { code: "unauthorized", message: "Token expired" } },
          401,
        )) as unknown as typeof fetch,
      onUnauthorized,
    });
    await expect(client.call("me")).rejects.toMatchObject({
      status: 401,
      code: "unauthorized",
    });
    await expect(client.call("me")).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledWith("user");
  });
});
