import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const base = process.env.BASE_URL ?? "http://localhost:3210";
const out = resolve(process.env.OUT_DIR ?? "../../docs/design/landing");
const format = process.env.FORMAT ?? "jpeg";
const only = process.env.LOCALES ? process.env.LOCALES.split(",") : ["uz", "ru", "en"];
const sections = ["hero", "how", "demo", "venues", "djs", "themes", "guests", "faq", "contact"];
const paths = { uz: "/", ru: "/ru", en: "/en" };
const viewports = [
  { name: "desktop", width: 1440, height: 900, mobile: false },
  { name: "mobile", width: 390, height: 844, mobile: true },
];
mkdirSync(out, { recursive: true });

async function settle(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 500) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(90);
  }
  await page.evaluate(() => {
    document
      .querySelectorAll("[data-reveal]")
      .forEach((node) => node.setAttribute("data-revealed", ""));
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
}

const browser = await chromium.launch();
try {
  for (const viewport of viewports) {
    for (const locale of only) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: viewport.mobile ? 2 : 1,
        isMobile: viewport.mobile,
        hasTouch: viewport.mobile,
        colorScheme: "dark",
        locale: locale === "uz" ? "uz-UZ" : locale === "ru" ? "ru-RU" : "en-US",
      });
      const page = await context.newPage();
      await page.goto(`${base}${paths[locale]}`, { waitUntil: "networkidle" });
      await settle(page);
      const options = format === "png" ? { type: "png" } : { type: "jpeg", quality: 80 };
      const ext = format === "png" ? "png" : "jpg";
      await page.screenshot({
        path: `${out}/${viewport.name}-${locale}-full.${ext}`,
        fullPage: true,
        ...options,
      });
      if (process.env.SECTIONS) {
        for (const id of sections) {
          const top = await page.evaluate(
            (selector) => {
              const node = document.querySelector(selector);
              return node ? node.getBoundingClientRect().top + window.scrollY : 0;
            },
            id === "hero" ? "section.lp-hero" : `#${id}`,
          );
          const shots = 2;
          for (let part = 0; part < shots; part += 1) {
            await page.evaluate(
              (y) => window.scrollTo(0, y),
              Math.max(0, top - 64 + part * (viewport.height - 100)),
            );
            await page.waitForTimeout(600);
            await page.screenshot({
              path: `${out}/${viewport.name}-${locale}-${id}-${part + 1}.${ext}`,
              ...options,
            });
          }
        }
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
