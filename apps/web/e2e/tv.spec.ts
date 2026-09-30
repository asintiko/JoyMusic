import { expect, test } from "@playwright/test";
import { e2eEnvironment } from "./environment";
import { slug } from "./support/dj";

const environment = e2eEnvironment();

test.use({ viewport: { width: 1920, height: 1080 }, isMobile: false, hasTouch: false });

test("the TV screen fits 16:9 without scrollbars and hides the cursor", async ({ page }) => {
  await page.goto(`/tv/${slug}`);
  await expect(page.getByTestId("tv-root")).toBeVisible();
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    cursor: getComputedStyle(document.querySelector("[data-testid=tv-root]") as Element).cursor,
    scale: getComputedStyle(document.documentElement).getPropertyValue("--tv-scale"),
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.innerHeight);
  expect(metrics.cursor).toBe("none");
  expect(Number(metrics.scale)).toBe(1);
});

test("the TV screen scales into smaller viewports", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/tv/${slug}`);
  await expect(page.getByTestId("tv-root")).toBeVisible();
  const scale = await page.evaluate(() =>
    Number(getComputedStyle(document.documentElement).getPropertyValue("--tv-scale")),
  );
  expect(scale).toBeCloseTo(1280 / 1920, 3);
});

test("theme and locale can be overridden from the URL", async ({ page }) => {
  await page.goto(`/tv/${slug}?theme=lounge&locale=ru`);
  await expect(page.getByTestId("tv-root")).toHaveAttribute("data-theme", "lounge");
  await expect(page.getByTestId("tv-idle-title")).toHaveText("Диджей скоро начнёт");
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await page.goto(`/tv/${slug}?theme=cafe&locale=uz`);
  await expect(page.getByTestId("tv-root")).toHaveAttribute("data-theme", "cafe");
  await expect(page.getByTestId("tv-idle-title")).toHaveText("DJ tez orada boshlaydi");
});

test("the TV QR code encodes the venue join url", async ({ page }) => {
  await page.goto(`/tv/${slug}`);
  const label = await page.getByTestId("tv-qr").getAttribute("aria-label");
  expect(label).toBe(`${new URL(environment.webUrl).host}/v/${slug}`);
  await expect(page.getByTestId("tv-qr").locator("svg")).toBeVisible();
});

test("an unknown venue on the TV route is a 404", async ({ page }) => {
  const response = await page.goto("/tv/does-not-exist");
  expect(response?.status()).toBe(404);
});
