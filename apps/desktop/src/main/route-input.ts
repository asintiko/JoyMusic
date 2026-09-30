import { routes } from "@joymusic/shared";
import type { RouteName } from "@joymusic/shared";

export function validateRouteInput(name: RouteName, input: unknown): unknown {
  const definition = routes[name] as {
    params?: { parse(value: unknown): unknown };
    query?: { parse(value: unknown): unknown };
    body?: { parse(value: unknown): unknown };
  };
  const source = (input ?? {}) as { params?: unknown; query?: unknown; body?: unknown };
  const result: { params?: unknown; query?: unknown; body?: unknown } = {};
  if (definition.params) result.params = definition.params.parse(source.params);
  if (definition.query) result.query = definition.query.parse(source.query);
  if (definition.body) result.body = definition.body.parse(source.body ?? {});
  return result;
}
