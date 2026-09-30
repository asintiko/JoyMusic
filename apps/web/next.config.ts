import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));

const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  reactStrictMode: true,
  experimental: { optimizePackageImports: ["@joymusic/ui", "lucide-react", "motion"] },
  agentRules: false,
  poweredByHeader: false,
  transpilePackages: ["@joymusic/ui", "@joymusic/shared", "@joymusic/qr", "@joymusic/brand"],
  serverExternalPackages: ["@resvg/resvg-js", "opentype.js"],
  turbopack: { root: repositoryRoot },
  outputFileTracingRoot: repositoryRoot,
  async redirects() {
    return [{ source: "/uz", destination: "/", permanent: true }];
  },
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/uz" }], afterFiles: [], fallback: [] };
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/landing/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default config;
