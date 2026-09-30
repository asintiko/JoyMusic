import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from "fastify";
import type { z } from "zod";
import type { MemberRole, RouteDefinition, RouteOutput } from "@joymusic/shared";
import { adminRoles, requireGuest, requireRole, requireUser } from "../modules/auth/guards";
import type { AuthUser, GuestContext, OrgContext } from "./context";

type Parsed<R extends RouteDefinition, K extends "params" | "query" | "body"> = R extends {
  [P in K]: infer S extends z.ZodType;
}
  ? z.output<S>
  : undefined;

type AuthContext<R extends RouteDefinition> = R extends { auth: "user" }
  ? { user: AuthUser }
  : R extends { auth: "guest" }
    ? { guest: GuestContext }
    : Record<never, never>;

export type RouteContext<R extends RouteDefinition> = {
  request: FastifyRequest;
  reply: FastifyReply;
  params: Parsed<R, "params">;
  query: Parsed<R, "query">;
  body: Parsed<R, "body">;
  org: OrgContext | null;
} & AuthContext<R>;

export type AdminRouteContext<R extends RouteDefinition> = Omit<RouteContext<R>, "org" | "user"> & {
  org: OrgContext;
  user: AuthUser;
};

export type RouteHandler<R extends RouteDefinition, C = RouteContext<R>> = (
  context: C,
) => Promise<RouteOutput<R>>;

export interface RouteRateLimit {
  max: number;
  timeWindow: string | number;
  keyGenerator?: (request: FastifyRequest) => string | Promise<string>;
}

export interface RegisterRouteOptions {
  roles?: readonly MemberRole[];
  rateLimit?: RouteRateLimit | false;
  preHandler?: preHandlerAsyncHookHandler[];
}

function authHandlers(auth: RouteDefinition["auth"]): preHandlerAsyncHookHandler[] {
  if (auth === "user") return [requireUser];
  if (auth === "guest") return [requireGuest];
  return [];
}

function registerWithContext<R extends RouteDefinition, C>(
  app: FastifyInstance,
  definition: R,
  handler: RouteHandler<R, C>,
  options: RegisterRouteOptions,
): void {
  const preHandlers = [
    ...authHandlers(definition.auth),
    ...(options.roles ? [requireRole(options.roles)] : []),
    ...(options.preHandler ?? []),
  ];
  const validateResponses = !app.deps.config.isProduction;
  app.route({
    method: definition.method,
    url: definition.path,
    config: options.rateLimit === undefined ? {} : { rateLimit: options.rateLimit },
    preHandler: preHandlers,
    handler: async (request, reply) => {
      const context = {
        request,
        reply,
        params: definition.params ? definition.params.parse(request.params) : undefined,
        query: definition.query ? definition.query.parse(request.query) : undefined,
        body: definition.body ? definition.body.parse(request.body) : undefined,
        org: request.org,
        user: request.user ?? undefined,
        guest: request.guest ?? undefined,
      } as C;
      const result = await handler(context);
      if (validateResponses) definition.response.parse(result);
      return reply.send(result);
    },
  });
}

export function registerRoute<R extends RouteDefinition>(
  app: FastifyInstance,
  definition: R,
  handler: RouteHandler<R>,
  options: RegisterRouteOptions = {},
): void {
  registerWithContext(app, definition, handler, options);
}

export function registerAdminRoute<R extends RouteDefinition & { auth: "user" }>(
  app: FastifyInstance,
  definition: R,
  handler: RouteHandler<R, AdminRouteContext<R>>,
  options: Omit<RegisterRouteOptions, "roles"> = {},
): void {
  registerWithContext(app, definition, handler, { ...options, roles: adminRoles });
}
