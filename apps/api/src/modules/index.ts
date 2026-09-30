import type { FastifyPluginAsync } from "fastify";
import { adminRoutes } from "./admin";
import { authRoutes } from "./auth/routes";
import { djRoutes } from "./dj/routes";
import { jobsPlugin } from "./jobs/plugin";
import { guestRoutes } from "./guest/routes";
import { realtimeRoutes } from "../realtime/routes";
import { healthRoutes } from "./health/routes";

export const appModules: FastifyPluginAsync[] = [
  healthRoutes,
  authRoutes,
  guestRoutes,
  adminRoutes,
  djRoutes,
  realtimeRoutes,
  jobsPlugin,
];
