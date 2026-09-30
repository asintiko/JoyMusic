import type { FastifyPluginAsync } from "fastify";
import { adminRoutes } from "./admin";
import { authRoutes } from "./auth/routes";
import { djRoutes } from "./dj/routes";
import { healthRoutes } from "./health/routes";

export const appModules: FastifyPluginAsync[] = [healthRoutes, authRoutes, adminRoutes, djRoutes];
