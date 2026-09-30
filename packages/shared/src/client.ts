import {
  apiErrorSchema,
  routes,
  type RouteDefinition,
  type RouteInput,
  type RouteName,
  type RouteOutput,
  type Routes,
} from "./api";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type TokenKind = "guest" | "user";

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: (kind: TokenKind) => string | null | undefined | Promise<string | null | undefined>;
  fetch?: typeof fetch;
  onUnauthorized?: (kind: TokenKind) => void;
  validateResponses?: boolean;
}

type CallArguments<N extends RouteName> = keyof RouteInput<Routes[N]> extends never
  ? []
  : [input: RouteInput<Routes[N]>];

interface RouteInputShape {
  params?: Record<string, string | number>;
  query?: Record<string, unknown>;
  body?: unknown;
}

function buildPath(path: string, params: Record<string, string | number> | undefined): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_match, key: string) => {
    const value = params?.[key];
    if (value === undefined) throw new Error(`Missing path parameter: ${key}`);
    return encodeURIComponent(String(value));
  });
}

function buildQuery(query: Record<string, unknown> | undefined): string {
  if (!query) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function createApiClient(options: ApiClientOptions) {
  const fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);
  const baseUrl = options.baseUrl.replace(/\/+$/, "");
  const validate = options.validateResponses ?? true;

  async function call<N extends RouteName>(
    name: N,
    ...args: CallArguments<N>
  ): Promise<RouteOutput<Routes[N]>> {
    const definition: RouteDefinition = routes[name];
    const input = (args[0] ?? {}) as RouteInputShape;
    const url = `${baseUrl}${buildPath(definition.path, input.params)}${buildQuery(input.query)}`;
    const headers: Record<string, string> = { accept: "application/json" };
    if (definition.body !== undefined) headers["content-type"] = "application/json";
    if (definition.auth !== "none") {
      const token = await options.getToken?.(definition.auth);
      if (token) headers.authorization = `Bearer ${token}`;
    }
    const response = await fetchImpl(url, {
      method: definition.method,
      headers,
      body: definition.body !== undefined ? JSON.stringify(input.body ?? {}) : undefined,
    });
    if (!response.ok) {
      if (response.status === 401 && definition.auth !== "none") {
        options.onUnauthorized?.(definition.auth);
      }
      const payload: unknown = await response.json().catch(() => null);
      const parsed = apiErrorSchema.safeParse(payload);
      if (parsed.success) {
        const { code, message, details } = parsed.data.error;
        throw new ApiError(response.status, code, message, details);
      }
      throw new ApiError(response.status, "internal", response.statusText || "Request failed");
    }
    const payload: unknown = await response.json();
    return (validate ? definition.response.parse(payload) : payload) as RouteOutput<Routes[N]>;
  }

  return { call };
}

export type ApiClient = ReturnType<typeof createApiClient>;
