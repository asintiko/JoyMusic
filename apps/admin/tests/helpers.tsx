import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, TooltipProvider } from "@joymusic/ui";
import type { Locale } from "@joymusic/shared";
import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { I18nProvider } from "../src/i18n";

export function renderWithProviders(ui: ReactElement, locale: Locale = "en") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const result = render(
    <I18nProvider initialLocale={locale}>
      <QueryClientProvider client={client}>
        <TooltipProvider>
          <Toaster>{ui}</Toaster>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nProvider>,
  );
  return { ...result, client };
}

export function memoryStore(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function errorResponse(
  status: number,
  code: string,
  message = code,
  details?: unknown,
): Response {
  return jsonResponse({ error: { code, message, details } }, status);
}

export const meFixture = {
  user: {
    id: "usr_1",
    email: "owner@example.com",
    name: "Owner",
    avatarUrl: null,
    locale: "ru" as const,
  },
  memberships: [{ organizationId: "org_1", organizationName: "Acme", role: "owner" as const }],
  isPlatformAdmin: false,
};

export function authFixture(
  overrides: Partial<{ accessToken: string; refreshToken: string; expiresIn: number }> = {},
) {
  return {
    accessToken: "access-1",
    refreshToken: "refresh-1",
    expiresIn: 900,
    me: meFixture,
    ...overrides,
  };
}

export const venueFixture = {
  id: "ven_1",
  organizationId: "org_1",
  slug: "joy-demo-club",
  name: "Joy Demo Club",
  city: "Tashkent",
  address: null,
  theme: "club" as const,
  logoUrl: null,
  coverUrl: null,
  timezone: "Asia/Tashkent",
  createdAt: "2026-09-01T00:00:00.000Z",
  activeSessionId: null,
  settings: {
    requestsOpen: true,
    maxRequestsPerDevice: 3,
    windowMinutes: 30,
    duplicateWindowMinutes: 60,
    allowFreeText: true,
    allowNotes: true,
    showArtwork: true,
    defaultLocale: "uz" as const,
  },
};

export type RouteHandler = (request: {
  url: URL;
  method: string;
  body: unknown;
}) => Response | Promise<Response>;

export function apiStub(handlers: Record<string, RouteHandler>) {
  const calls: Array<{ key: string; body: unknown }> = [];
  const mock = async (input: RequestInfo | URL, init?: RequestInit) => {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(raw);
    const method = (init?.method ?? "GET").toUpperCase();
    const key = `${method} ${url.pathname}`;
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ key, body });
    const handler = handlers[key];
    if (!handler) return errorResponse(404, "not_found", `no stub for ${key}`);
    return handler({ url, method, body });
  };
  return { mock, calls };
}
