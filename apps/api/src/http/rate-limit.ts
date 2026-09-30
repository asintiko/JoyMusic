import type { FastifyRequest } from "fastify";
import type { Deps } from "../deps";
import { optionalGuest } from "../modules/auth/guards";
import type { RouteRateLimit } from "./register-route";

export function guestOrIpKey(deps: Deps): (request: FastifyRequest) => Promise<string> {
  return async (request) => {
    const guest = await optionalGuest(deps, request);
    return guest ? `guest:${guest.deviceId}` : request.ip;
  };
}

export function guestLimit(deps: Deps, max: number): RouteRateLimit {
  return { max, timeWindow: "1 minute", keyGenerator: guestOrIpKey(deps) };
}
