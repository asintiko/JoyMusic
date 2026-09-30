import { cache } from "react";
import { cookies, headers } from "next/headers";
import { ApiError, createApiClient, type Locale, type VenueState } from "@joymusic/shared";
import { localeCookieName, resolveLocale } from "./locale";

const serverApiUrl = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
).replace(/\/+$/, "");

const serverApi = createApiClient({
  baseUrl: serverApiUrl,
  fetch: (input, init) =>
    fetch(input, { ...init, cache: "no-store", signal: AbortSignal.timeout(4000) }),
});

export type VenueLookup =
  { status: "ok"; state: VenueState } | { status: "not_found" } | { status: "unavailable" };

export const lookupVenue = cache(async (slug: string): Promise<VenueLookup> => {
  try {
    const state = await serverApi.call("venueState", { params: { slug } });
    return { status: "ok", state };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return { status: "not_found" };
    return { status: "unavailable" };
  }
});

export async function requestOrigin(): Promise<string> {
  const configured = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/+$/, "");
  if (configured) return configured;
  const list = await headers();
  const host = list.get("x-forwarded-host") ?? list.get("host") ?? "localhost:3000";
  const forwarded = list.get("x-forwarded-proto");
  const protocol = forwarded ?? (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function resolveRequestLocale(
  venueDefault: Locale,
  override?: string | null,
  preferNavigator = true,
): Promise<Locale> {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  return resolveLocale({
    override,
    cookie: cookieStore.get(localeCookieName)?.value,
    acceptLanguage: headerList.get("accept-language"),
    venueDefault,
    preferNavigator,
  });
}
