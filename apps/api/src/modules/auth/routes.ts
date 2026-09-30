import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import { routes } from "@joymusic/shared";
import { registerRoute } from "../../http/register-route";
import { createAuthService, toMe, type RequestMeta } from "./service";

function requestMeta(request: FastifyRequest): RequestMeta {
  const userAgent = request.headers["user-agent"];
  return { userAgent: typeof userAgent === "string" ? userAgent : null, ip: request.ip };
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  const service = createAuthService(app.deps);
  const strictLimit = { max: app.deps.config.rateLimit.authMax, timeWindow: "1 minute" };

  registerRoute(
    app,
    routes.authRegister,
    async ({ body, request, reply }) => {
      reply.code(201);
      return service.register(body, requestMeta(request));
    },
    { rateLimit: strictLimit },
  );

  registerRoute(
    app,
    routes.authLogin,
    ({ body, request }) => service.login(body, requestMeta(request)),
    { rateLimit: strictLimit },
  );

  registerRoute(
    app,
    routes.authRefresh,
    ({ body, request }) => service.refresh(body.refreshToken, requestMeta(request)),
    { rateLimit: strictLimit },
  );

  registerRoute(
    app,
    routes.authLogout,
    async ({ body }) => {
      await service.logout(body.refreshToken);
      return { ok: true as const };
    },
    { rateLimit: strictLimit },
  );

  registerRoute(
    app,
    routes.authInviteAccept,
    ({ body, request }) => service.acceptInvite(body, requestMeta(request)),
    { rateLimit: strictLimit },
  );

  registerRoute(
    app,
    routes.authGoogle,
    ({ body, request }) => service.google(body.idToken, requestMeta(request)),
    { rateLimit: strictLimit },
  );

  registerRoute(app, routes.authDesktopAuthorize, ({ body, user }) =>
    service.desktopAuthorize(user, body),
  );

  registerRoute(
    app,
    routes.authDesktopToken,
    ({ body, request }) => service.desktopToken(body, requestMeta(request)),
    { rateLimit: strictLimit },
  );

  registerRoute(app, routes.me, ({ user }) => Promise.resolve(toMe(user)));
};
