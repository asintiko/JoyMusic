import type { FastifyPluginAsync, FastifyRequest } from "fastify";
import websocket from "@fastify/websocket";
import { realtimePath, realtimeQuerySchema } from "@joymusic/shared";
import { AppError, forbidden, notFound } from "../errors";
import { anyRole, assertVenueAccess, loadAuthUser } from "../modules/auth/guards";
import { findVenueBySlug } from "../modules/venues/state";
import { createRealtimeHub, type ConnectionContext } from "./hub";

export const realtimeRoutes: FastifyPluginAsync = async (app) => {
  const deps = app.deps;
  const { config } = deps;
  const hub = createRealtimeHub(deps, app.log);
  const contexts = new WeakMap<FastifyRequest, ConnectionContext>();
  const perIp = new Map<string, number>();

  await app.register(websocket, {
    options: { maxPayload: config.realtime.maxMessageBytes },
  });

  function reserveSlot(request: FastifyRequest): void {
    const ip = request.ip;
    const used = perIp.get(ip) ?? 0;
    if (used >= config.realtime.maxConnectionsPerIp) {
      throw new AppError("rate_limited", 429, "Too many realtime connections from this address", {
        headers: { "retry-after": "30" },
      });
    }
    perIp.set(ip, used + 1);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      const remaining = (perIp.get(ip) ?? 1) - 1;
      if (remaining <= 0) perIp.delete(ip);
      else perIp.set(ip, remaining);
    };
    request.raw.once("close", release);
    request.raw.socket.once("close", release);
  }

  async function authorize(request: FastifyRequest): Promise<void> {
    const origin = request.headers.origin;
    if (origin && !config.corsOrigins.includes(origin)) throw forbidden("Origin not allowed");
    const query = realtimeQuerySchema.parse(request.query);
    const venue = await findVenueBySlug(deps.db, query.venue);
    if (!venue) throw notFound("Venue not found");
    let deviceId: string | null = null;
    if (query.role === "dj") {
      const { userId } = await deps.tokens.verifyAccessToken(query.token ?? "");
      const user = await loadAuthUser(deps.db, userId);
      if (!user) throw new AppError("unauthorized", 401, "Account no longer exists");
      await assertVenueAccess(deps, user, venue.id, anyRole);
    } else if (query.token) {
      const claims = await deps.tokens.verifyGuestToken(query.token).catch(() => null);
      if (claims?.venueId === venue.id) deviceId = claims.deviceId;
    }
    reserveSlot(request);
    contexts.set(request, { venue, role: query.role, deviceId });
  }

  app.get(
    realtimePath,
    { websocket: true, config: { rateLimit: false }, preValidation: authorize },
    (socket, request) => {
      const context = contexts.get(request);
      if (!context) {
        socket.close(1011, "context_missing");
        return;
      }
      hub.accept(socket, context);
    },
  );

  app.addHook("onClose", async () => {
    await hub.close();
  });
};
