import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const here = dirname(fileURLToPath(import.meta.url));
const output = resolve(here, "../../../docs/design/app");
const web = process.env.WEB_URL ?? "http://localhost:3000";
const api = process.env.API_URL ?? "http://localhost:4400";
const password = process.env.SEED_PASSWORD ?? "joymusic-demo";
const only = (process.env.ONLY ?? "").split(",").filter(Boolean);
mkdirSync(output, { recursive: true });

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const json = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} ${response.status} ${text}`);
  return json;
}

const venues = [
  {
    slug: "joy-demo-club",
    name: "Joy Demo Club",
    city: "Toshkent",
    theme: "club",
    locale: "uz",
    tracks: [
      "Ozoda Tasalli ber",
      "The Weeknd Blinding Lights",
      "Dua Lipa Levitating",
      "Daft Punk One More Time",
      "Shahzoda Yomgir",
      "Timur Soul Yulduzlar",
    ],
    dedications: { 1: "Aziz", 3: "Madina" },
  },
  {
    slug: "nomad-lounge",
    name: "Nomad Lounge",
    city: "Toshkent",
    theme: "lounge",
    locale: "ru",
    tracks: [
      "Ozod Nilufar Oydin kecha",
      "Norah Jones Don't Know Why",
      "Chet Baker Almost Blue",
      "Tima Belorusskih Mokrye krossovki",
      "Laylo Kechqurun",
      "Shahzoda Habibi",
    ],
    dedications: { 1: "Мадины", 2: "Сардора" },
  },
  {
    slug: "cafe-nur",
    name: "Café Nur",
    city: "Samarqand",
    theme: "cafe",
    locale: "en",
    tracks: [
      "Ed Sheeran Perfect",
      "Adele Someone Like You",
      "Ozoda Alamlar",
      "Sevinch Mominova Ne boldi",
      "Rayhon Orzuinga ishon",
      "Yulduz Usmonova Ayriliq",
    ],
    dedications: { 1: "Grandma" },
  },
];

const owner = await call("POST", "/v1/auth/login", {
  body: { email: "demo@joymusic.uz", password },
});
const dj = await call("POST", "/v1/auth/login", { body: { email: "dj@joymusic.uz", password } });

async function ensureVenue(spec) {
  try {
    await call("POST", "/v1/admin/venues", {
      token: owner.accessToken,
      body: { name: spec.name, slug: spec.slug, city: spec.city, theme: spec.theme },
    });
  } catch (error) {
    if (!String(error.message).includes("409")) throw error;
  }
  return call("GET", `/v1/venues/${spec.slug}`);
}

async function endSession(spec) {
  const state = await call("GET", `/v1/venues/${spec.slug}/state`);
  if (state.session) {
    await call("POST", `/v1/dj/sessions/${state.session.id}/end`, { token: dj.accessToken });
  }
}

async function startSession(spec, venue, options = {}) {
  await endSession(spec);
  const session = await call("POST", `/v1/dj/venues/${venue.id}/sessions`, {
    token: dj.accessToken,
  });
  await call("PATCH", `/v1/dj/sessions/${session.id}/settings`, {
    token: dj.accessToken,
    body: { defaultLocale: spec.locale, requestsOpen: options.requestsOpen ?? true },
  });
  const requests = [];
  for (const [index, query] of spec.tracks.entries()) {
    const found = await call("GET", `/v1/catalog/search?q=${encodeURIComponent(query)}&limit=1`);
    const track = found.tracks[0];
    if (!track) continue;
    requests.push(
      await call("POST", `/v1/dj/sessions/${session.id}/requests`, {
        token: dj.accessToken,
        body: { track, dedicatedTo: spec.dedications[index] },
      }),
    );
  }
  const playing = requests[0];
  if (playing && options.play !== false) {
    await call("POST", `/v1/dj/requests/${playing.id}/play`, { token: dj.accessToken });
    await call("PUT", `/v1/dj/sessions/${session.id}/nowplaying`, {
      token: dj.accessToken,
      body: {
        title: playing.title,
        artist: playing.artist,
        artworkUrl: playing.artworkUrl,
        durationSec: playing.track?.durationSec ?? 210,
        bpm: 118,
        key: "8A",
        source: "request",
        requestId: playing.id,
        startedAt: new Date(Date.now() - 83_000).toISOString(),
      },
    });
  }
  return { session, requests };
}

const browser = await chromium.launch();

async function phone(locale, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport ?? { width: 390, height: 844 },
    deviceScaleFactor: options.scale ?? 2,
    isMobile: true,
    hasTouch: true,
    locale,
    colorScheme: "dark",
  });
  const page = await context.newPage();
  return { context, page };
}

async function settle(page, ms = 1600) {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(ms);
}

async function save(page, name, extra = {}) {
  if (only.length > 0 && !only.some((entry) => name.includes(entry))) return;
  await page.screenshot({
    path: resolve(output, `${name}.jpg`),
    type: "jpeg",
    quality: 86,
    ...extra.options,
  });
  process.stdout.write(`saved ${name}\n`);
}

const prepared = new Map();
for (const spec of venues) {
  const venue = await ensureVenue(spec);
  prepared.set(spec.slug, { venue, ...(await startSession(spec, venue)) });
}

for (const spec of venues) {
  const { context, page } = await phone(spec.locale);
  await page.goto(`${web}/v/${spec.slug}`);
  await settle(page, 2200);
  await save(page, `guest-now-${spec.theme}-${spec.locale}`);
  await context.close();
}

{
  const spec = venues[0];
  const { context, page } = await phone("uz", {
    viewport: { width: 768, height: 1024 },
    scale: 1.5,
  });
  await page.goto(`${web}/v/${spec.slug}`);
  await settle(page, 2200);
  await save(page, "guest-now-club-tablet-uz");
  await context.close();
}

{
  const spec = venues[0];
  const { context, page } = await phone("uz");
  await page.goto(`${web}/v/${spec.slug}`);
  await settle(page);
  await page.getByTestId("open-search").click();
  await page.waitForTimeout(2500);
  await save(page, "guest-search-suggestions-club-uz");
  await context.close();
}

const searchShots = [
  { spec: venues[0], locale: "ru", query: "Шахзода", name: "guest-search-club-ru" },
  { spec: venues[1], locale: "en", query: "Shahzoda", name: "guest-search-lounge-en" },
  { spec: venues[2], locale: "uz", query: "Ozoda", name: "guest-search-cafe-uz" },
];
for (const shot of searchShots) {
  const { context, page } = await phone(shot.locale);
  await page.goto(`${web}/v/${shot.spec.slug}`);
  await settle(page);
  await page.getByTestId("open-search").click();
  await page.getByTestId("search-overlay").getByRole("searchbox").fill(shot.query);
  await page.getByTestId("track-result").first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(2200);
  await save(page, shot.name);
  if (shot.name === "guest-search-club-ru") {
    await page.getByTestId("track-result").nth(1).getByRole("button").last().click();
    await page.waitForTimeout(800);
    await page.locator("input[name=dedicatedTo]").fill("Азиза");
    await page.locator("textarea[name=note]").fill("С днём рождения!");
    await save(page, "guest-request-club-ru");
  }
  await context.close();
}

{
  const spec = venues[0];
  const { context, page } = await phone("en");
  await context.route("**/v1/venues/*/requests", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      headers: { "access-control-allow-origin": web },
      body: JSON.stringify({
        error: {
          code: "request_limit_reached",
          message: "limit",
          details: { limit: 3, windowMinutes: 30, retryAfterSeconds: 754 },
        },
      }),
    });
  });
  await page.goto(`${web}/v/${spec.slug}`);
  await settle(page);
  await page.getByTestId("open-search").click();
  await page.getByTestId("search-overlay").getByRole("searchbox").fill("Dua Lipa");
  await page.getByTestId("track-result").first().waitFor({ timeout: 20000 });
  await page.getByTestId("track-result").first().getByRole("button").last().click();
  await page.waitForTimeout(700);
  await page.getByTestId("request-submit").click();
  await page.waitForTimeout(900);
  await save(page, "guest-limit-club-en");
  await context.close();
}

{
  const spec = venues[1];
  const { context, page } = await phone("ru");
  await page.goto(`${web}/v/${spec.slug}`);
  await settle(page);
  const stored = await page.evaluate(
    (slug) => window.localStorage.getItem(`jm:guest:${slug}`),
    spec.slug,
  );
  const token = JSON.parse(stored).token;
  const { requests, session } = prepared.get(spec.slug);
  const mine = [];
  for (const query of ["Shahzoda Habibi", "Sevinch Mominova Ne boldi", "Ozoda Alamlar"]) {
    const found = await call("GET", `/v1/catalog/search?q=${encodeURIComponent(query)}&limit=1`);
    const created = await call("POST", `/v1/venues/${spec.slug}/requests`, {
      token,
      body: { track: found.tracks[0], dedicatedTo: mine.length === 0 ? "Азиза" : undefined },
    });
    mine.push(created.request);
  }
  await call("POST", `/v1/dj/requests/${mine[0].id}/accept`, { token: dj.accessToken });
  await call("POST", `/v1/dj/requests/${mine[2].id}/decline`, {
    token: dj.accessToken,
    body: { reason: "Не сегодня" },
  });
  await page.reload();
  await settle(page, 1500);
  await page.getByTestId("open-mine").click();
  await page.waitForTimeout(1200);
  await save(page, "guest-mine-lounge-ru");
  void requests;
  void session;
  await context.close();
}

{
  const spec = venues[0];
  const { session } = prepared.get(spec.slug);
  await call("PATCH", `/v1/dj/sessions/${session.id}/settings`, {
    token: dj.accessToken,
    body: { requestsOpen: false },
  });
  const { context, page } = await phone("en");
  await page.goto(`${web}/v/${spec.slug}`);
  await settle(page);
  await save(page, "guest-closed-club-en");
  await context.setOffline(true);
  await page.waitForTimeout(800);
  await save(page, "guest-offline-club-en");
  await context.close();
  await call("PATCH", `/v1/dj/sessions/${session.id}/settings`, {
    token: dj.accessToken,
    body: { requestsOpen: true },
  });
}

for (const [spec, locale] of [
  [venues[2], "uz"],
  [venues[1], "en"],
]) {
  await endSession(spec);
  const { context, page } = await phone(locale);
  await page.goto(`${web}/v/${spec.slug}`);
  await settle(page);
  await save(page, `guest-waiting-${spec.theme}-${locale}`);
  await context.close();
}

{
  const spec = venues[0];
  const venue = prepared.get(spec.slug).venue;
  await startSession(spec, venue, { play: false });
  const { context, page } = await phone("ru");
  await page.goto(`${web}/v/${spec.slug}`);
  await settle(page);
  await save(page, "guest-idle-club-ru");
  await context.close();
  await startSession(spec, venue);
}

for (const spec of [venues[1], venues[2]]) {
  await startSession(spec, prepared.get(spec.slug).venue);
}

const tvContext = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});
const tvMatrix = [
  [venues[0], "uz"],
  [venues[0], "ru"],
  [venues[0], "en"],
  [venues[1], "ru"],
  [venues[1], "uz"],
  [venues[1], "en"],
  [venues[2], "en"],
  [venues[2], "ru"],
  [venues[2], "uz"],
];
for (const [spec, locale] of tvMatrix) {
  const page = await tvContext.newPage();
  await page.goto(`${web}/tv/${spec.slug}?locale=${locale}`);
  await settle(page, 2800);
  await save(page, `tv-${spec.theme}-${locale}`, { type: "jpg", options: { quality: 84 } });
  await page.close();
}

{
  const spec = venues[0];
  const venue = prepared.get(spec.slug).venue;
  await startSession(spec, venue, { play: false });
  const page = await tvContext.newPage();
  await page.goto(`${web}/tv/${spec.slug}?locale=uz`);
  await settle(page, 2800);
  await save(page, "tv-idle-club-uz", { type: "jpg", options: { quality: 84 } });
  await endSession(spec);
  await page.goto(`${web}/tv/${spec.slug}?locale=ru&theme=lounge`);
  await settle(page, 2800);
  await save(page, "tv-waiting-club-ru", { type: "jpg", options: { quality: 84 } });
  await page.close();
  await startSession(spec, venue);
}

await browser.close();
