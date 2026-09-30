import type { TestProject } from "vitest/node";
import { startServices } from "./support/services";
import type { E2eEnvironment } from "./support/services";

declare module "vitest" {
  export interface ProvidedContext {
    e2e: E2eEnvironment;
  }
}

let stop: (() => Promise<void>) | null = null;

export default async function setup(project: TestProject) {
  const started = await startServices({
    apiPort: Number(process.env.E2E_API_PORT ?? 4090),
    shimPort: Number(process.env.E2E_SHIM_PORT ?? 5290),
    databaseName: process.env.E2E_DATABASE ?? "joymusic_desktop_e2e",
  });
  stop = started.stop;
  project.provide("e2e", started.environment);
  return async () => {
    await stop?.();
  };
}
