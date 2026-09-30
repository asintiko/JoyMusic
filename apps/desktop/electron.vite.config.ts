import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "electron-vite";
import { rendererAliases } from "./build/aliases";

const productionEndpoints = {
  apiUrl: process.env.JOYMUSIC_BUILD_API_URL ?? "https://api.joymusic.uz",
  adminUrl: process.env.JOYMUSIC_BUILD_ADMIN_URL ?? "https://admin.joymusic.uz",
  webUrl: process.env.JOYMUSIC_BUILD_WEB_URL ?? "https://joymusic.uz",
};

const developmentEndpoints = {
  apiUrl: process.env.JOYMUSIC_BUILD_API_URL ?? "http://localhost:4000",
  adminUrl: process.env.JOYMUSIC_BUILD_ADMIN_URL ?? "http://localhost:5173",
  webUrl: process.env.JOYMUSIC_BUILD_WEB_URL ?? "http://localhost:3000",
};

export default defineConfig(({ command }) => ({
  main: {
    define: {
      __JOY_BUILD_ENDPOINTS__: JSON.stringify(
        command === "build" ? productionEndpoints : developmentEndpoints,
      ),
    },
    build: {
      outDir: "out/main",
      rollupOptions: {
        input: { index: resolve(import.meta.dirname, "src/main/index.ts") },
      },
    },
  },
  preload: {
    build: {
      outDir: "out/preload",
      rollupOptions: {
        input: { index: resolve(import.meta.dirname, "src/preload/index.ts") },
        output: { format: "cjs", entryFileNames: "[name].cjs" },
      },
    },
  },
  renderer: {
    root: resolve(import.meta.dirname, "src/renderer"),
    plugins: [react(), tailwindcss()],
    resolve: { alias: rendererAliases() },
    build: {
      outDir: resolve(import.meta.dirname, "out/renderer"),
      emptyOutDir: true,
      chunkSizeWarningLimit: 2500,
      rollupOptions: {
        input: { index: resolve(import.meta.dirname, "src/renderer/index.html") },
      },
    },
  },
}));
