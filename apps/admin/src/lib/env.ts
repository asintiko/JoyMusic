const raw = import.meta.env;

function clean(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/\/+$/, "") : fallback;
}

export const env = {
  apiUrl: clean(raw.VITE_API_URL, "http://localhost:4000"),
  googleClientId: raw.VITE_GOOGLE_CLIENT_ID?.trim() ?? "",
  publicWebUrl: clean(raw.VITE_PUBLIC_WEB_URL, "http://localhost:3000"),
} as const;
