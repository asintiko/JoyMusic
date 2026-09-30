import type { FastifyPluginAsync } from "fastify";
import { and, asc, inArray, isNull } from "drizzle-orm";
import { routes } from "@joymusic/shared";
import { venues } from "../../db/schema";
import { registerRoute } from "../../http/register-route";
import { activeSessionIds } from "../venues/service";
import { djNowPlayingRoutes } from "./nowplaying";
import { djQueueRoutes } from "./queue";
import { djSessionRoutes } from "./sessions";

export const djRoutes: FastifyPluginAsync = async (app) => {
  const { db } = app.deps;

  await app.register(djSessionRoutes);
  await app.register(djQueueRoutes);
  await app.register(djNowPlayingRoutes);

  registerRoute(app, routes.djVenues, async ({ user }) => {
    const organizationIds = [...new Set(user.memberships.map((entry) => entry.organizationId))];
    if (organizationIds.length === 0) return { venues: [] };
    const rows = await db
      .select()
      .from(venues)
      .where(and(inArray(venues.organizationId, organizationIds), isNull(venues.deletedAt)))
      .orderBy(asc(venues.name), asc(venues.id));
    const sessions = await activeSessionIds(
      db,
      rows.map((row) => row.id),
    );
    return {
      venues: rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        theme: row.theme,
        activeSessionId: sessions.get(row.id) ?? null,
      })),
    };
  });
};
