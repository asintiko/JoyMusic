import { expect, test } from "@playwright/test";
import { e2eEnvironment } from "./environment";
import { slug } from "./support/dj";

const environment = e2eEnvironment();

test("the manifest is per venue and its icons resolve", async ({ page, request }) => {
  await page.goto(`/v/${slug}`);
  const href = await page.locator("link[rel=manifest]").getAttribute("href");
  expect(href).toBe(`/v/${slug}/manifest.webmanifest`);
  const response = await request.get(`${environment.webUrl}${href}`);
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.name).toBe("Joy Demo Club");
  expect(manifest.display).toBe("standalone");
  expect(manifest.start_url).toContain(`/v/${slug}`);
  expect(manifest.theme_color).toBe("#0A0812");
  for (const icon of manifest.icons) {
    const iconResponse = await request.get(`${environment.webUrl}${icon.src}`);
    expect(iconResponse.status()).toBe(200);
    expect(iconResponse.headers()["content-type"]).toContain("image/png");
  }
  expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === "maskable")).toBe(
    true,
  );
  await expect(page.locator("meta[name=theme-color]")).toHaveAttribute("content", "#0A0812");
});

test("the service worker installs and serves the app offline", async ({ page, context }) => {
  await page.goto(`/v/${slug}`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Joy Demo Club" })).toBeVisible();
  await context.setOffline(false);
});

test("the service worker never caches API traffic", async ({ page }) => {
  await page.goto(`/v/${slug}`);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls: string[] = [];
    for (const name of names) {
      const cache = await caches.open(name);
      for (const entry of await cache.keys()) urls.push(entry.url);
    }
    return urls;
  });
  expect(cached.length).toBeGreaterThan(0);
  expect(cached.some((url) => url.includes("/v1/") || url.includes(":4410"))).toBe(false);
});
