import { defineConfig } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { e2eEnvironment } from "./e2e/environment";

const webDirectory = fileURLToPath(new URL(".", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const environment = e2eEnvironment();

export default defineConfig({
  testDir: "./e2e",
  testMatch: /.*\.spec\.ts/,
  timeout: 90_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "./test-results",
  use: {
    baseURL: environment.webUrl,
    locale: "en-US",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "node apps/web/e2e/prepare.mjs && pnpm --filter @joymusic/api exec tsx src/index.ts",
      cwd: repositoryRoot,
      url: `${environment.apiUrl}/v1/health`,
      reuseExistingServer: Boolean(process.env.E2E_REUSE),
      timeout: 60_000,
      env: environment.api,
    },
    {
      command: "pnpm exec next build && pnpm exec next start --port " + environment.webPort,
      cwd: webDirectory,
      url: environment.webUrl,
      reuseExistingServer: Boolean(process.env.E2E_REUSE),
      timeout: 240_000,
      env: environment.web,
    },
  ],
});
