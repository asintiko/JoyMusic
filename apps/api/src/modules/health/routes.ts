import type { FastifyPluginAsync } from "fastify";
import { routes } from "@joymusic/shared";
import { sql } from "drizzle-orm";
import { AppError } from "../../errors";
import { registerRoute } from "../../http/register-route";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  registerRoute(
    app,
    routes.health,
    async () => {
      try {
        await app.deps.db.execute(sql`select 1`);
      } catch (error) {
        app.log.error({ err: error }, "database health check failed");
        throw new AppError("internal", 503, "Database unavailable");
      }
      return { status: "ok" as const, time: new Date().toISOString() };
    },
    { rateLimit: false },
  );
};
