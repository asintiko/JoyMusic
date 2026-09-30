import type { FastifyPluginAsync } from "fastify";
import { desc, eq } from "drizzle-orm";
import { routes } from "@joymusic/shared";
import { auditLog, users } from "../../db/schema";
import { registerAdminRoute } from "../../http/register-route";

export const adminAuditRoutes: FastifyPluginAsync = async (app) => {
  const { db } = app.deps;

  registerAdminRoute(app, routes.adminAudit, async ({ query, org }) => {
    const rows = await db
      .select({ entry: auditLog, actorName: users.name })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.actorUserId))
      .where(eq(auditLog.organizationId, org.organizationId))
      .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
      .limit(query.limit);
    return {
      entries: rows.map((row) => ({
        id: row.entry.id,
        actorName: row.actorName ?? "System",
        action: row.entry.action,
        target: row.entry.target,
        meta: row.entry.meta,
        createdAt: row.entry.createdAt.toISOString(),
      })),
    };
  });
};
