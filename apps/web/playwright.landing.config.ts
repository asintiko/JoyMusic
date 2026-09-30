import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";

const webDirectory = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.LANDING_E2E_PORT ?? 3130);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  testMatch: /landing\.spec\.ts/,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [["list"]],
  outputDir: "./test-results",
  use: {
    baseURL,
    locale: "en-US",
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm exec next build && pnpm exec next start --port ${port}`,
    cwd: webDirectory,
    url: baseURL,
    reuseExistingServer: Boolean(process.env.E2E_REUSE),
    timeout: 240_000,
    env: { NEXT_DIST_DIR: "dist/next-landing", NEXT_TELEMETRY_DISABLED: "1" },
  },
});
