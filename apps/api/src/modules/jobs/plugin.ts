import type { FastifyPluginAsync } from "fastify";
import { createJobScheduler } from "./scheduler";
import { createJobTasks } from "./tasks";

export const jobsPlugin: FastifyPluginAsync = async (app) => {
  const { config } = app.deps;
  if (!config.jobs.enabled) return;
  const scheduler = createJobScheduler(createJobTasks(app.deps, app.log), {
    intervalMs: config.jobs.intervalMs,
    onError: (name, error) => app.log.error({ err: error, job: name }, "background job failed"),
  });
  app.addHook("onReady", async () => scheduler.start());
  app.addHook("onClose", async () => scheduler.stop());
};
