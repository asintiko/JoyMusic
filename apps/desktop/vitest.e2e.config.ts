import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "e2e",
    environment: "node",
    include: ["e2e/**/*.e2e.test.ts"],
    globalSetup: ["./e2e/global-setup.ts"],
    testTimeout: 60_000,
    hookTimeout: 180_000,
    fileParallelism: false,
    sequence: { concurrent: false },
  },
});
