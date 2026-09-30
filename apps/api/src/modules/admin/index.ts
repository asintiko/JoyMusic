import type { FastifyPluginAsync } from "fastify";
import { adminAnalyticsRoutes } from "./analytics";
import { adminAuditRoutes } from "./audit";
import { adminMemberRoutes } from "./members";
import { adminModerationRoutes } from "./moderation";
import { adminQrRoutes } from "./qr";
import { adminSessionRoutes } from "./sessions";
import { adminVenueRoutes } from "./venues";

export const adminRoutes: FastifyPluginAsync = async (app) => {
  await app.register(adminVenueRoutes);
  await app.register(adminQrRoutes);
  await app.register(adminMemberRoutes);
  await app.register(adminSessionRoutes);
  await app.register(adminAnalyticsRoutes);
  await app.register(adminModerationRoutes);
  await app.register(adminAuditRoutes);
};
