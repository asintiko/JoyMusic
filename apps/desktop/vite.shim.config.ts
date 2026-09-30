import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { rendererAliases } from "./build/aliases";

export default defineConfig({
  root: resolve(import.meta.dirname, "src/renderer"),
  mode: "shim",
  plugins: [react(), tailwindcss()],
  resolve: { alias: rendererAliases() },
  server: {
    host: "127.0.0.1",
    port: 5290,
    strictPort: true,
    fs: { allow: [resolve(import.meta.dirname, "../..")] },
  },
  preview: { host: "127.0.0.1", port: 5290, strictPort: true },
  build: {
    outDir: resolve(import.meta.dirname, "out/shim"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2500,
  },
});
