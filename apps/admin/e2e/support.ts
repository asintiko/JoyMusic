import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

export const apiUrl = "http://localhost:4321";
export const ownerEmail = "demo@joymusic.uz";
export const djEmail = "dj@joymusic.uz";
export const seedPassword = "joymusic-demo";

export function unique(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

export async function apiLogin(request: APIRequestContext, email: string, password = seedPassword) {
  const response = await request.post(`${apiUrl}/v1/auth/login`, { data: { email, password } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { accessToken: string; refreshToken: string };
}

export async function signInWithToken(
  context: BrowserContext,
  request: APIRequestContext,
  email = ownerEmail,
  locale: "ru" | "en" | "uz" = "en",
) {
  const tokens = await apiLogin(request, email);
  await context.addInitScript(
    ({ refresh, lang }) => {
      if (!window.localStorage.getItem("joymusic.admin.refresh")) {
        window.localStorage.setItem("joymusic.admin.refresh", refresh);
      }
      if (!window.localStorage.getItem("joymusic.admin.locale")) {
        window.localStorage.setItem("joymusic.admin.locale", lang);
      }
    },
    { refresh: tokens.refreshToken, lang: locale },
  );
}

export async function uiLogin(page: Page, email: string, password = seedPassword) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function createVenueViaApi(request: APIRequestContext, name: string, slug: string) {
  const tokens = await apiLogin(request, ownerEmail);
  const response = await request.post(`${apiUrl}/v1/admin/venues`, {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
    data: { name, slug, city: "Toshkent", theme: "lounge", timezone: "Asia/Tashkent" },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as { id: string; slug: string; name: string };
}
