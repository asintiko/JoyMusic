import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, fs: { allow: [repositoryRoot] } },
  preview: { port: 5173, strictPort: true },
  build: {
    target: "es2023",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react-dom") || id.includes("node_modules/react/")) {
            return "react";
          }
          if (id.includes("@tanstack")) return "tanstack";
          if (id.includes("motion") || id.includes("@radix-ui")) return "ui-kit";
          return undefined;
        },
      },
    },
  },
});
