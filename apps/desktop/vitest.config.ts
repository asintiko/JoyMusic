import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    css: false,
    projects: [
      {
        extends: true,
        test: {
          name: "main",
          environment: "node",
          include: ["tests/main/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "renderer",
          environment: "jsdom",
          include: ["tests/renderer/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/setup.ts"],
        },
      },
    ],
  },
});
