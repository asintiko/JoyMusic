import type { FastifyPluginAsync } from "fastify";
import { desc, eq } from "drizzle-orm";
import { routes } from "@joymusic/shared";
import { djSessions } from "../../db/schema";
import { registerAdminRoute } from "../../http/register-route";
import { adminRoles, assertVenueAccess } from "../auth/guards";
import { summarizeSessions } from "../sessions/summary";

export const adminSessionRoutes: FastifyPluginAsync = async (app) => {
  const { db } = app.deps;

  registerAdminRoute(app, routes.adminSessions, async ({ params, query, user }) => {
    const venue = await assertVenueAccess(app.deps, user, params.venueId, adminRoles);
    const rows = await db
      .select()
      .from(djSessions)
      .where(eq(djSessions.venueId, venue.id))
      .orderBy(desc(djSessions.startedAt), desc(djSessions.id))
      .limit(query.limit);
    return { sessions: await summarizeSessions(db, rows) };
  });
};
