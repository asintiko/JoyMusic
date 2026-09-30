import type { FastifyInstance } from "fastify";
import {
  routes,
  type RouteInput,
  type RouteName,
  type RouteOutput,
  type Routes,
} from "@joymusic/shared";

interface CallExtras {
  token?: string | undefined;
  headers?: Record<string, string>;
  remoteAddress?: string;
}

type QueryOptional<T> = T extends { query: infer Q } ? Omit<T, "query"> & { query?: Q } : T;

type CallInput<N extends RouteName> = QueryOptional<RouteInput<Routes[N]>> & CallExtras;

type CallArguments<N extends RouteName> = keyof RouteInput<Routes[N]> extends never
  ? [input?: CallExtras]
  : [input: CallInput<N>];

interface ShapedInput {
  params?: Record<string, string | number>;
  query?: Record<string, unknown>;
  body?: unknown;
}

export interface TestResponse {
  status: number;
  body: unknown;
  headers: Record<string, unknown>;
}

function fillPath(path: string, params: Record<string, string | number> | undefined): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_match, key: string) => {
    const value = params?.[key];
    if (value === undefined) throw new Error(`missing path param ${key}`);
    return encodeURIComponent(String(value));
  });
}

function queryString(query: Record<string, unknown> | undefined): string {
  if (!query) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function createApi(app: FastifyInstance) {
  async function call<N extends RouteName>(
    name: N,
    ...args: CallArguments<N>
  ): Promise<TestResponse> {
    const definition = routes[name] as (typeof routes)[RouteName];
    const input = (args[0] ?? {}) as ShapedInput & CallExtras;
    const headers: Record<string, string> = { ...input.headers };
    if (input.token) headers.authorization = `Bearer ${input.token}`;
    const hasBody = "body" in definition;
    if (hasBody) headers["content-type"] = "application/json";
    const response = await app.inject({
      method: definition.method,
      url: `${fillPath(definition.path, input.params)}${queryString(input.query)}`,
      headers,
      ...(hasBody ? { payload: JSON.stringify(input.body ?? {}) } : {}),
      ...(input.remoteAddress ? { remoteAddress: input.remoteAddress } : {}),
    });
    const text = response.body;
    return {
      status: response.statusCode,
      body: text ? (JSON.parse(text) as unknown) : null,
      headers: response.headers,
    };
  }

  async function ok<N extends RouteName>(
    name: N,
    ...args: CallArguments<N>
  ): Promise<RouteOutput<Routes[N]>> {
    const response = await call(name, ...args);
    if (response.status < 200 || response.status >= 300) {
      throw new Error(
        `${String(name)} failed with ${response.status}: ${JSON.stringify(response.body)}`,
      );
    }
    return routes[name].response.parse(response.body) as RouteOutput<Routes[N]>;
  }

  const raw = call as unknown as (name: RouteName, input?: unknown) => Promise<TestResponse>;

  return { call, ok, raw };
}

export type TestApi = ReturnType<typeof createApi>;

export function errorCode(response: TestResponse): string | undefined {
  const body = response.body as { error?: { code?: string } } | null;
  return body?.error?.code;
}
