import type { EndpointConfig } from "../core/environment";

export const developmentEndpoints: EndpointConfig = {
  apiUrl: "http://localhost:4000",
  adminUrl: "http://localhost:5173",
  webUrl: "http://localhost:3000",
};

export function normalizeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().replace(/\/+$/u, "");
  } catch {
    return null;
  }
}

export function resolveEndpoints(
  env: Record<string, string | undefined>,
  buildDefaults: EndpointConfig,
): EndpointConfig {
  const pick = (names: string[], fallback: string): string => {
    for (const name of names) {
      const value = normalizeUrl(env[name]);
      if (value) return value;
    }
    return normalizeUrl(fallback) ?? fallback;
  };
  return {
    apiUrl: pick(["API_URL", "JOYMUSIC_API_URL"], buildDefaults.apiUrl),
    adminUrl: pick(["ADMIN_URL", "JOYMUSIC_ADMIN_URL"], buildDefaults.adminUrl),
    webUrl: pick(["WEB_URL", "JOYMUSIC_WEB_URL"], buildDefaults.webUrl),
  };
}
