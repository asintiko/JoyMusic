import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";

const here = fileURLToPath(new URL(".", import.meta.url));
const output = resolve(here, "../.lighthouse");
mkdirSync(output, { recursive: true });

const target = process.argv[2] ?? "http://localhost:3000/v/joy-demo-club";
const port = 9333;
const chromePath = chromium.executablePath();
const profile = mkdtempSync(join(tmpdir(), "jm-lighthouse-"));

const browser = spawn(
  chromePath,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

async function waitForChrome() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      await new Promise((done) => setTimeout(done, 200));
    }
  }
  throw new Error("Chrome did not start");
}

function summarize(result) {
  const { categories, audits } = result.lhr;
  const scores = Object.fromEntries(
    Object.entries(categories).map(([key, value]) => [key, Math.round((value.score ?? 0) * 100)]),
  );
  const metrics = Object.fromEntries(
    [
      "first-contentful-paint",
      "largest-contentful-paint",
      "total-blocking-time",
      "cumulative-layout-shift",
      "speed-index",
      "interactive",
    ].map((id) => [id, audits[id]?.displayValue ?? "n/a"]),
  );
  return { scores, metrics };
}

try {
  await waitForChrome();
  const runs = [];
  const repeat = Number(process.env.RUNS ?? 3);
  for (let index = 0; index < repeat; index += 1) {
    const result = await lighthouse(target, {
      port,
      output: "json",
      logLevel: "error",
      onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
    });
    if (!result) throw new Error("Lighthouse returned no result");
    runs.push(summarize(result));
    writeFileSync(join(output, `run-${index + 1}.json`), result.report);
  }
  process.stdout.write(`${JSON.stringify({ target, runs }, null, 2)}\n`);
} finally {
  browser.kill();
}

const pwaBrowser = await chromium.launch();
const context = await pwaBrowser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
});
const page = await context.newPage();
await page.goto(target, { waitUntil: "networkidle" });
await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
});
await page.reload({ waitUntil: "networkidle" });
const session = await context.newCDPSession(page);
const installability = await session.send("Page.getInstallabilityErrors");
const manifest = await session.send("Page.getAppManifest");
const controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller));
const themeColor = await page.evaluate(
  () => document.querySelector("meta[name=theme-color]")?.getAttribute("content") ?? null,
);
const viewport = await page.evaluate(
  () => document.querySelector("meta[name=viewport]")?.getAttribute("content") ?? null,
);
await context.setOffline(true);
const offlineOk = await page
  .reload({ waitUntil: "domcontentloaded" })
  .then(async () => (await page.locator("h1").count()) > 0)
  .catch(() => false);
await pwaBrowser.close();
const parsed = manifest.data ? JSON.parse(manifest.data) : null;
process.stdout.write(
  `${JSON.stringify(
    {
      installabilityErrors: installability.installabilityErrors,
      manifestUrl: manifest.url,
      manifestErrors: manifest.errors.length,
      manifestName: parsed?.name ?? null,
      display: parsed?.display ?? null,
      icons: parsed?.icons?.map((icon) => `${icon.sizes} ${icon.purpose}`) ?? [],
      serviceWorkerControlsPage: controlled,
      themeColor,
      viewport,
      offlineReloadRendersApp: offlineOk,
    },
    null,
    2,
  )}\n`,
);
