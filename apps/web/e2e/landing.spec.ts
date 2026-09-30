import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import jsQR from "jsqr";

const locales = [
  { code: "uz", path: "/", lang: "uz", primary: "Bepul boshlash", faq: "Mehmonlar ilova" },
  { code: "ru", path: "/ru", lang: "ru", primary: "Начать бесплатно", faq: "Нужно ли гостям" },
  { code: "en", path: "/en", lang: "en", primary: "Start free", faq: "Do guests need" },
] as const;

const demoUrl = "http://localhost:3000/v/joy-demo-club";

function collectProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => problems.push(`requestfailed: ${request.url()}`));
  return problems;
}

async function scrollThrough(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(40);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

for (const locale of locales) {
  test.describe(`landing ${locale.code}`, () => {
    test("renders without console errors and with correct semantics", async ({ page }) => {
      const problems = collectProblems(page);
      await page.goto(locale.path, { waitUntil: "networkidle" });
      await scrollThrough(page);
      await expect(page.locator("html")).toHaveAttribute("lang", locale.lang);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator("main#main")).toBeVisible();
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      expect(await page.locator('link[rel="alternate"][hreflang]').count()).toBe(4);
      await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
      await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
      expect(problems).toEqual([]);
    });

    test("primary CTA opens the admin panel", async ({ page }) => {
      await page.goto(locale.path);
      const cta = page.getByRole("link", { name: locale.primary }).first();
      await expect(cta).toHaveAttribute("href", "http://localhost:5173");
      const secondary = page.locator('a[href="#how"].lp-btn');
      await expect(secondary).toHaveCount(1);
    });

    test("has no horizontal scroll at 390px", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(locale.path, { waitUntil: "networkidle" });
      await scrollThrough(page);
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);
    });

    test("faq accordion opens with the keyboard", async ({ page }) => {
      await page.goto(locale.path);
      const question = page.getByRole("button", { name: new RegExp(locale.faq) });
      await question.scrollIntoViewIfNeeded();
      await expect(question).toHaveAttribute("aria-expanded", "true");
      await question.focus();
      await page.keyboard.press("Enter");
      await expect(question).toHaveAttribute("aria-expanded", "false");
      await page.keyboard.press("Space");
      await expect(question).toHaveAttribute("aria-expanded", "true");
    });
  });
}

test("language switcher navigates and persists the choice", async ({ page }) => {
  await page.goto("/");
  await page.locator("header").getByRole("link", { name: "Русский" }).click();
  await expect(page).toHaveURL(/\/ru$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  const cookies = await page.context().cookies();
  expect(cookies.find((cookie) => cookie.name === "jm-locale")?.value).toBe("ru");
  await page.goto("/");
  await expect(page).toHaveURL(/\/ru$/);
  await page.locator("header").getByRole("link", { name: "Oʻzbekcha" }).click();
  await expect(page).toHaveURL(/:\d+\/$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "uz");
  await page.goto("/");
  await expect(page).toHaveURL(/:\d+\/$/);
});

test("uz alias redirects to the root", async ({ request }) => {
  const response = await request.get("/uz", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/");
});

test("venue theme switcher retints the mockup", async ({ page }) => {
  await page.goto("/en");
  const stage = page.getByTestId("theme-stage");
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute("data-theme", "club");
  await page.getByRole("radio", { name: "Lounge" }).click();
  await expect(stage).toHaveAttribute("data-theme", "lounge");
  await page.getByRole("radio", { name: "Café" }).click();
  await expect(stage).toHaveAttribute("data-theme", "cafe");
});

test("demo QR decodes to the demo venue URL", async ({ page }) => {
  await page.goto("/en", { waitUntil: "networkidle" });
  const image = page.getByTestId("demo-qr");
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveJSProperty("complete", true);
  const pixels = await page.evaluate(async () => {
    const source = document.querySelector<HTMLImageElement>('[data-testid="demo-qr"]');
    if (!source) throw new Error("QR image missing");
    const size = 720;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, size, size);
    context.drawImage(source, 0, 0, size, size);
    return { size, data: Array.from(context.getImageData(0, 0, size, size).data) };
  });
  const decoded = jsQR(new Uint8ClampedArray(pixels.data), pixels.size, pixels.size);
  expect(decoded?.data).toBe(demoUrl);
});

test("mini phone runs the simulated request flow", async ({ page }) => {
  await page.goto("/en");
  const group = page.getByRole("group", { name: "Simulated guest phone" });
  await group.scrollIntoViewIfNeeded();
  await group.getByRole("button", { name: "Search a song or artist" }).click();
  await group.getByRole("button", { name: "Request: Night Signal" }).click();
  await group.getByRole("button", { name: /Dedication/ }).click();
  await group.getByRole("button", { name: "Send to the DJ" }).click();
  await expect(group.getByText("Request received")).toBeVisible();
  await expect(group.getByText("Accepted by the DJ")).toBeVisible({ timeout: 6000 });
  await expect(group.getByText("Your track is on")).toBeVisible({ timeout: 8000 });
  await group.getByRole("button", { name: "Start over" }).click();
  await expect(group.getByRole("button", { name: "Search a song or artist" })).toBeVisible();
});

test("desktop downloads are labelled as coming soon and link to releases", async ({ page }) => {
  await page.goto("/en");
  for (const platform of ["mac", "windows"]) {
    const link = page.locator(`a[data-platform="${platform}"]`);
    await expect(link).toHaveAttribute("href", /github\.com\/.+\/releases/);
    await expect(link).toContainText("Coming soon");
  }
});

test("robots and sitemap describe the public site", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /v/");
  expect(robots).toContain("Disallow: /tv/");
  expect(robots).toContain("Sitemap:");
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const path of ["/</loc>", "/ru</loc>", "/en</loc>"]) expect(sitemap).toContain(path);
});
