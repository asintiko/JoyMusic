import { defineConfig, devices } from "@playwright/test";

const apiPort = 4321;
const adminPort = 5184;
const apiUrl = `http://localhost:${apiPort}`;
const adminUrl = `http://localhost:${adminPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  outputDir: "./test-results",
  use: {
    baseURL: adminUrl,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    viewport: { width: 1440, height: 900 },
    acceptDownloads: true,
    storageState: {
      cookies: [],
      origins: [
        { origin: adminUrl, localStorage: [{ name: "joymusic.admin.locale", value: "en" }] },
      ],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
  ],
  webServer: [
    {
      command: "node e2e/start-api.mjs",
      url: `${apiUrl}/v1/health`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: { E2E_API_PORT: String(apiPort), E2E_ADMIN_ORIGIN: adminUrl },
    },
    {
      command: `pnpm exec vite build && pnpm exec vite preview --port ${adminPort} --strictPort`,
      url: adminUrl,
      timeout: 180_000,
      reuseExistingServer: false,
      env: { VITE_API_URL: apiUrl },
    },
  ],
});
