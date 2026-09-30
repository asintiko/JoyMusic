import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const here = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(here, "../..");
const repositoryRoot = resolve(packageRoot, "../..");

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((entry) => entry.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const outputDirectory = resolve(argument("out", resolve(repositoryRoot, "docs/design/screens")));
const only = argument("only", "").split(",").filter(Boolean);
const themesFilter = argument("themes", "club,lounge,cafe").split(",");
const port = Number(argument("port", "5199"));
const skipBuild = process.argv.includes("--skip-build");
const baseUrl = `http://127.0.0.1:${port}`;

const mockups = [
  {
    id: "guest-now",
    width: 390,
    height: 844,
    scale: 2,
    langs: { club: "uz", lounge: "ru", cafe: "en" },
  },
  {
    id: "guest-search",
    width: 390,
    height: 844,
    scale: 2,
    langs: { club: "ru", lounge: "en", cafe: "uz" },
  },
  {
    id: "tv",
    width: 1920,
    height: 1080,
    scale: 1,
    langs: { club: "uz", lounge: "ru", cafe: "en" },
  },
  { id: "dj", width: 1440, height: 900, scale: 1, langs: { club: "en", lounge: "uz", cafe: "ru" } },
  {
    id: "admin",
    width: 1440,
    height: 900,
    scale: 1,
    langs: { club: "ru", lounge: "en", cafe: "uz" },
  },
];

const extras = [
  { id: "guest-now", theme: "club", lang: "ru", suffix: "ru", width: 390, height: 844, scale: 2 },
  { id: "guest-now", theme: "club", lang: "en", suffix: "en", width: 390, height: 844, scale: 2 },
  {
    id: "guest-now",
    theme: "club",
    lang: "uz",
    suffix: "photo",
    photo: true,
    width: 390,
    height: 844,
    scale: 2,
  },
  { id: "dj", theme: "club", lang: "ru", suffix: "ru", width: 1440, height: 900, scale: 1 },
  { id: "tv", theme: "lounge", lang: "uz", suffix: "uz", width: 1920, height: 1080, scale: 1 },
];

async function waitForServer() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    }
  }
  throw new Error("Preview server did not start");
}

function run(command, args, options) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.on("exit", (code) =>
      code === 0 ? resolveRun() : reject(new Error(`${command} exited ${code}`)),
    );
  });
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
}

async function main() {
  mkdirSync(outputDirectory, { recursive: true });
  const vite = resolve(packageRoot, "node_modules/.bin/vite");
  const configPath = resolve(packageRoot, "playground/vite.config.ts");
  if (!skipBuild) await run(vite, ["build", "--config", configPath], { cwd: packageRoot });
  const server = spawn(vite, ["preview", "--config", configPath, "--host", "127.0.0.1"], {
    cwd: packageRoot,
    stdio: "ignore",
  });
  try {
    await waitForServer();
    const browser = await chromium.launch();
    const jobs = [];
    for (const mockup of mockups) {
      for (const theme of themesFilter) {
        jobs.push({ ...mockup, theme, lang: mockup.langs[theme], suffix: mockup.langs[theme] });
      }
    }
    for (const extra of extras) if (themesFilter.includes(extra.theme)) jobs.push(extra);
    for (const job of jobs) {
      if (only.length > 0 && !only.includes(job.id)) continue;
      const context = await browser.newContext({
        viewport: { width: job.width, height: job.height },
        deviceScaleFactor: job.scale,
      });
      const page = await context.newPage();
      const photo = job.photo ? "1" : "0";
      await page.goto(
        `${baseUrl}/?view=${job.id}&theme=${job.theme}&lang=${job.lang}&photo=${photo}&bare=1`,
      );
      await page.waitForSelector("#mockup");
      await settle(page);
      const file = `${job.id}-${job.theme}-${job.suffix}.png`;
      await page.locator("#mockup").screenshot({ path: resolve(outputDirectory, file) });
      console.log(file);
      await context.close();
    }
    if (only.length === 0 || only.includes("gallery")) {
      for (const theme of themesFilter) {
        const context = await browser.newContext({
          viewport: { width: 1280, height: 900 },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        await page.goto(`${baseUrl}/?view=gallery&theme=${theme}&lang=en&bare=1`);
        await page.waitForSelector("[data-gallery]");
        await settle(page);
        const file = `gallery-${theme}-en.png`;
        await page.screenshot({ path: resolve(outputDirectory, file), fullPage: true });
        console.log(file);
        await context.close();
      }
      const overlays = [
        { id: "open-sheet", name: "sheet", lang: "uz", theme: "club" },
        { id: "open-side-sheet", name: "side-sheet", lang: "ru", theme: "lounge" },
        { id: "open-dialog", name: "dialog", lang: "en", theme: "cafe" },
        { id: "open-toast", name: "toast", lang: "uz", theme: "club" },
        { id: "open-palette", name: "palette", lang: "ru", theme: "club" },
      ];
      for (const overlay of overlays) {
        const isPhone = overlay.name === "sheet" || overlay.name === "toast";
        const context = await browser.newContext({
          viewport: isPhone ? { width: 390, height: 844 } : { width: 1280, height: 800 },
          deviceScaleFactor: isPhone ? 2 : 1,
        });
        const page = await context.newPage();
        await page.goto(
          `${baseUrl}/?view=gallery&theme=${overlay.theme}&lang=${overlay.lang}&bare=1`,
        );
        await page.waitForSelector("[data-gallery]");
        await settle(page);
        await page.getByTestId(overlay.id).click();
        await page.waitForTimeout(900);
        const file = `overlay-${overlay.name}-${overlay.theme}-${overlay.lang}.png`;
        await page.screenshot({ path: resolve(outputDirectory, file) });
        console.log(file);
        await context.close();
      }
    }
    await browser.close();
  } finally {
    server.kill("SIGTERM");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
