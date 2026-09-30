import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, "../../..");

function argument(name, fallback) {
  const prefix = `--${name}=`;
  const found = process.argv.find((entry) => entry.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

const outputDirectory = resolve(argument("out", resolve(repositoryRoot, "docs/design/admin")));
const only = argument("only", "").split(",").filter(Boolean);
const baseUrl = argument("base", "http://localhost:5173");
const apiUrl = argument("api", "http://localhost:4320");
const email = argument("email", "demo@joymusic.uz");
const password = argument("password", "joymusic-demo");

const desktop = { width: 1440, height: 900 };
const tablet = { width: 1024, height: 768 };

const shots = [
  { name: "login-ru", path: "/login", lang: "ru", anonymous: true, viewport: desktop },
  { name: "login-uz", path: "/login", lang: "uz", anonymous: true, viewport: desktop },
  { name: "register-en", path: "/register", lang: "en", anonymous: true, viewport: desktop },
  { name: "overview-ru", path: "/", lang: "ru", viewport: desktop, wait: "svg[role=group]" },
  { name: "overview-en", path: "/", lang: "en", viewport: desktop, wait: "svg[role=group]" },
  { name: "overview-uz", path: "/", lang: "uz", viewport: desktop, wait: "svg[role=group]" },
  { name: "overview-tablet", path: "/", lang: "ru", viewport: tablet, wait: "svg[role=group]" },
  { name: "venues-ru", path: "/venues", lang: "ru", viewport: desktop, wait: "table" },
  { name: "venues-tablet", path: "/venues", lang: "en", viewport: tablet, wait: "table" },
  { name: "venue-wizard-ru", path: "/venues/new", lang: "ru", viewport: desktop },
  {
    name: "venue-detail-en",
    path: "/venues/:demo",
    lang: "en",
    viewport: desktop,
    wait: "[role=switch]",
  },
  { name: "qr-ru", path: "/qr", lang: "ru", viewport: desktop, wait: "[data-testid=qr-preview]" },
  {
    name: "qr-uz",
    path: "/qr",
    lang: "uz",
    viewport: desktop,
    wait: "[data-testid=qr-preview]",
    template: "sticker",
  },
  {
    name: "qr-en-poster",
    path: "/qr",
    lang: "en",
    viewport: desktop,
    wait: "[data-testid=qr-preview]",
    template: "poster",
  },
  { name: "djs-ru", path: "/djs", lang: "ru", viewport: desktop, wait: "table" },
  { name: "sessions-en", path: "/sessions", lang: "en", viewport: desktop, wait: "table" },
  {
    name: "moderation-ru",
    path: "/moderation",
    lang: "ru",
    viewport: desktop,
    wait: "[data-testid=banned-word]",
  },
  {
    name: "analytics-ru",
    path: "/analytics",
    lang: "ru",
    viewport: desktop,
    wait: "svg[role=group]",
    full: true,
  },
  {
    name: "analytics-uz",
    path: "/analytics",
    lang: "uz",
    viewport: desktop,
    wait: "svg[role=group]",
  },
  {
    name: "branding-en",
    path: "/branding",
    lang: "en",
    viewport: desktop,
    wait: "[data-testid^=theme-preview]",
  },
  { name: "billing-ru", path: "/billing", lang: "ru", viewport: desktop },
  { name: "audit-ru", path: "/audit", lang: "ru", viewport: desktop, wait: "table" },
  { name: "settings-en", path: "/settings", lang: "en", viewport: desktop },
  {
    name: "palette-ru",
    path: "/",
    lang: "ru",
    viewport: desktop,
    wait: "svg[role=group]",
    palette: true,
  },
  {
    name: "dj-notice-en",
    path: "/dj",
    lang: "en",
    viewport: desktop,
    credentials: ["dj@joymusic.uz", password],
  },
  {
    name: "desktop-authorize-ru",
    path: `/desktop/authorize?state=${"s".repeat(16)}&challenge=${"c".repeat(43)}`,
    lang: "ru",
    viewport: desktop,
  },
  { name: "error-state-ru", path: "/venues", lang: "ru", viewport: desktop, offline: true },
  {
    name: "wizard-look-en",
    path: "/venues/new",
    lang: "en",
    viewport: desktop,
    act: async (page) => {
      await page.getByLabel(/Venue name/).fill("Aurora Terrace");
      await page.getByText("Address is available").waitFor();
      await page.getByRole("button", { name: "Next" }).click();
      await page.getByRole("radio").nth(1).click();
    },
  },
  {
    name: "team-invite-ru",
    path: "/djs",
    lang: "ru",
    viewport: desktop,
    wait: "table",
    act: async (page) => {
      await page.getByRole("button", { name: "Пригласить" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Email", { exact: true }).fill("rustam@nomad.uz");
      await dialog.getByRole("button", { name: "Создать приглашение" }).click();
      await dialog.getByRole("textbox").waitFor();
    },
  },
  {
    name: "qr-create-dialog-uz",
    path: "/qr",
    lang: "uz",
    viewport: desktop,
    wait: "[data-testid=qr-preview]",
    act: async (page) => {
      await page.getByRole("button", { name: "Yangi kod" }).click();
      await page.getByRole("tab", { name: "Bir nechta stol" }).click();
    },
  },
  {
    name: "venue-unsaved-ru",
    path: "/venues/:demo",
    lang: "ru",
    viewport: desktop,
    wait: "[role=switch]",
    act: async (page) => {
      await page.getByLabel("Заказов на гостя").fill("5");
      await page.getByLabel("Окно лимита").fill("45");
      await page.getByRole("radio").nth(1).click();
      await page.evaluate(() => window.scrollTo(0, 0));
    },
  },
  {
    name: "delete-venue-en",
    path: "/venues/:demo",
    lang: "en",
    viewport: desktop,
    wait: "[role=switch]",
    act: async (page) => {
      await page.getByRole("button", { name: "Delete venue" }).first().click();
    },
  },
  { name: "sessions-uz", path: "/sessions", lang: "uz", viewport: desktop, wait: "table" },
  { name: "audit-en", path: "/audit", lang: "en", viewport: desktop, wait: "table" },
  {
    name: "moderation-uz",
    path: "/moderation",
    lang: "uz",
    viewport: desktop,
    wait: "[data-testid=banned-word]",
  },
  { name: "billing-uz", path: "/billing", lang: "uz", viewport: desktop },
  {
    name: "analytics-en",
    path: "/analytics",
    lang: "en",
    viewport: desktop,
    wait: "svg[role=group]",
  },
  {
    name: "shortcuts-en",
    path: "/",
    lang: "en",
    viewport: desktop,
    wait: "svg[role=group]",
    act: async (page) => {
      await page.keyboard.press("?");
    },
  },
  { name: "loading-ru", path: "/venues", lang: "ru", viewport: desktop, slow: true },
  { name: "empty-venues-ru", path: "/venues", lang: "ru", viewport: desktop, empty: true },
];

async function login(credentials) {
  const response = await fetch(`${apiUrl}/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: credentials[0], password: credentials[1] }),
  });
  if (!response.ok) throw new Error(`login failed: ${response.status}`);
  return response.json();
}

async function registerFresh() {
  const suffix = Math.random().toString(36).slice(2, 8);
  const response = await fetch(`${apiUrl}/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: `empty-${suffix}@example.com`,
      password: "password-12345",
      name: "Malika Yusupova",
      organizationName: "Fresh Start",
    }),
  });
  if (!response.ok) throw new Error(`register failed: ${response.status}`);
  return response.json();
}

const browser = await chromium.launch();
const demo = await login([email, password]);
const venuesResponse = await fetch(`${apiUrl}/v1/admin/venues`, {
  headers: { authorization: `Bearer ${demo.accessToken}` },
});
const venues = (await venuesResponse.json()).venues;
const demoVenue = venues.find((venue) => venue.slug === "joy-demo-club") ?? venues[0];

mkdirSync(outputDirectory, { recursive: true });

for (const shot of shots) {
  if (only.length > 0 && !only.includes(shot.name)) continue;
  const context = await browser.newContext({ viewport: shot.viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const messages = [];
  page.on("pageerror", (error) => messages.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") messages.push(`console: ${message.text()}`);
  });
  const credentials = shot.empty
    ? await registerFresh()
    : await login(shot.credentials ?? [email, password]);
  await context.addInitScript(
    ({ lang, refresh, anonymous }) => {
      window.localStorage.setItem("joymusic.admin.locale", lang);
      if (anonymous) window.localStorage.removeItem("joymusic.admin.refresh");
      else if (!window.localStorage.getItem("joymusic.admin.refresh")) {
        window.localStorage.setItem("joymusic.admin.refresh", refresh);
      }
    },
    { lang: shot.lang, refresh: credentials.refreshToken, anonymous: Boolean(shot.anonymous) },
  );
  if (shot.slow) {
    await page.route("**/v1/admin/**", async (route) => {
      await new Promise((done) => setTimeout(done, 4000));
      await route.continue();
    });
  }
  if (shot.offline) {
    await page.route("**/v1/admin/venues", (route) => route.abort("failed"));
  }
  const path = shot.path.replace(":demo", demoVenue.id);
  await page.goto(`${baseUrl}${path}`);
  if (shot.wait) await page.waitForSelector(shot.wait, { timeout: 15000 }).catch(() => undefined);
  if (shot.act) await shot.act(page);
  if (shot.template) {
    await page
      .getByRole("button", {
        name: new RegExp(
          shot.template === "sticker" ? "Стикер|Stiker|Sticker" : "Плакат|Plakat|Poster",
          "i",
        ),
      })
      .click();
  }
  if (shot.palette) {
    await page.keyboard.press("Control+k");
    await page.waitForSelector("[role=combobox]");
    await page.keyboard.type("qr");
  }
  await page.waitForTimeout(shot.slow ? 600 : shot.offline ? 6500 : 900);
  await page.screenshot({
    path: resolve(outputDirectory, `${shot.name}.png`),
    fullPage: Boolean(shot.full),
  });
  if (messages.length > 0)
    process.stdout.write(`${shot.name}: ${messages.slice(0, 3).join(" | ")}\n`);
  process.stdout.write(`saved ${shot.name}\n`);
  await context.close();
}

await browser.close();
