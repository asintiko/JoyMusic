import { buildApp } from "./app";
import { loadConfig } from "./config";
import { runMigrations } from "./db/migrate";
import { createDeps } from "./deps";

const shutdownTimeoutMs = 15_000;

async function main() {
  const config = loadConfig();
  if (config.migrateOnStart) await runMigrations(config.databaseUrl);
  const deps = createDeps(config);
  const app = await buildApp(deps);

  let shuttingDown = false;
  async function shutdown(signal: string, exitCode: number) {
    if (shuttingDown) return;
    shuttingDown = true;
    app.log.info({ signal }, "shutting down");
    setTimeout(() => process.exit(1), shutdownTimeoutMs).unref();
    try {
      await app.close();
      await deps.close();
      process.exit(exitCode);
    } catch (error) {
      app.log.error({ err: error }, "shutdown failed");
      process.exit(1);
    }
  }
  process.on("SIGINT", () => void shutdown("SIGINT", 0));
  process.on("SIGTERM", () => void shutdown("SIGTERM", 0));
  process.on("unhandledRejection", (reason) => {
    app.log.error({ err: reason }, "unhandled rejection");
  });

  await app.listen({ host: config.host, port: config.port });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
