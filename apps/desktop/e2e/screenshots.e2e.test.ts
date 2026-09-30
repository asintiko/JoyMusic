import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { chromium } from "playwright-core";
import sharp from "sharp";
import type { Browser, BrowserContext, Page } from "playwright-core";
import type { Locale, Track } from "@joymusic/shared";
import { createTestApi } from "./support/api";
import { shimAddress } from "./support/browser";
import { seedSettings } from "./support/settings";
import { repositoryRoot } from "./support/services";

const enabled = process.env.E2E_SCREENSHOTS === "1";
const environment = inject("e2e");
const api = createTestApi(environment);
const outputDirectory = process.env.SCREENSHOT_DIR ?? join(repositoryRoot, "docs/design/desktop");
const extraDirectory = process.env.SCREENSHOT_EXTRA_DIR ?? "";

const fakeMidiScript = `
  (() => {
    const input = { id: "in-1", name: "DDJ-FLX4", manufacturer: "Pioneer DJ", state: "connected", onmidimessage: null };
    const output = { id: "out-1", name: "DDJ-FLX4", manufacturer: "Pioneer DJ", state: "connected", send() {} };
    const map = (port) => ({ forEach: (callback) => callback(port) });
    const access = { inputs: map(input), outputs: map(output), onstatechange: null };
    navigator.requestMIDIAccess = async () => access;
  })();
`;

const coverCache = new Map<string, Buffer | null>();

function downloadCover(url: string): Buffer | null {
  if (coverCache.has(url)) return coverCache.get(url) ?? null;
  let result: Buffer | null;
  try {
    const body = execFileSync("curl", ["-sSL", "--max-time", "15", url], {
      maxBuffer: 8 * 1024 * 1024,
    });
    result = body.length < 500 ? null : body;
  } catch {
    result = null;
  }
  coverCache.set(url, result);
  return result;
}

let browser: Browser;
let djToken = "";
let ownerToken = "";
let venueId = "";
let sessionId = "";
const tableTokens = new Map<string, string>();

async function shot(page: Page, name: string, directory = outputDirectory) {
  mkdirSync(directory, { recursive: true });
  const raw = await page.screenshot();
  await sharp(raw)
    .png({ palette: true, quality: 90, effort: 8, compressionLevel: 9 })
    .toFile(join(directory, `${name}.png`));
}

async function newContext(
  namespace: string,
  settings: Record<string, unknown>,
  size = { width: 1440, height: 900 },
): Promise<BrowserContext> {
  const context = await browser.newContext({ viewport: size, colorScheme: "dark" });
  await context.addInitScript(fakeMidiScript);
  await context.route(/dzcdn\.net|mzstatic\.com/u, async (route) => {
    const body = downloadCover(route.request().url());
    if (!body) {
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "image/jpeg",
      body,
      headers: { "access-control-allow-origin": "*" },
    });
  });
  await seedSettings(context, namespace, settings);
  return context;
}

async function login(page: Page, namespace: string) {
  await page.goto(shimAddress(environment, namespace));
  await page.waitForSelector("[data-testid=login]");
  await page.fill("[data-testid=login-email]", environment.djEmail);
  await page.fill("[data-testid=login-password]", environment.djPassword);
  await page.click("[data-testid=login-submit]");
  await page.waitForSelector("[data-testid=picker]");
}

async function enter(page: Page) {
  await page.click(`[data-testid=enter-${environment.venueSlug}]`);
  await page.waitForSelector("[data-testid=console]");
  await page.waitForSelector("[data-testid=realtime-chip][data-state=open]");
}

async function settle(page: Page, ms = 900) {
  await page.waitForTimeout(ms);
}

async function orderTrack(
  song: [artist: string, title: string],
  extra: { table?: string; note?: string; dedicatedTo?: string },
) {
  const [artist, title] = song;
  const track: Track | null = await api.catalogTrack(artist, title);
  const input = {
    artist: track?.artist ?? artist,
    title: track?.title ?? title,
    note: extra.note,
    dedicatedTo: extra.dedicatedTo,
    tableToken: extra.table ? tableTokens.get(extra.table) : undefined,
  };
  try {
    return (await api.guestRequest({ ...input, track })).request;
  } catch (error) {
    console.warn(
      "track request failed",
      song,
      JSON.stringify((error as { details?: unknown }).details),
    );
    return (await api.guestRequest({ ...input, track: null })).request;
  }
}

describe.skipIf(!enabled)("design screenshots", () => {
  beforeAll(async () => {
    browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
    djToken = (await api.djLogin()).accessToken;
    ownerToken = (await api.ownerLogin()).accessToken;
    await api.endActiveSession(djToken);
    const venues = await api.asUser(djToken).call("djVenues");
    venueId = venues.venues[0]?.id ?? "";
    const codes = await api.asUser(ownerToken).call("adminQrList", { params: { venueId } });
    for (const code of codes.codes) tableTokens.set(code.label, code.token);
  });

  afterAll(async () => {
    await browser?.close();
  });

  it("captures login and picker in three languages", async () => {
    for (const locale of ["en", "ru", "uz"] as Locale[]) {
      const context = await newContext(`shots-login-${locale}`, { locale });
      const page = await context.newPage();
      await page.goto(shimAddress(environment, `shots-login-${locale}`));
      await page.waitForSelector("[data-testid=login]");
      await settle(page, 1200);
      await shot(page, `login-${locale}`);
      if (locale === "en") {
        await page.fill("[data-testid=login-email]", environment.djEmail);
        await page.fill("[data-testid=login-password]", "wrong");
        await page.click("[data-testid=login-submit]");
        await page.waitForSelector("[data-testid=login-error]");
        await settle(page, 400);
        await shot(page, "login-error-en");
        await page.click("[data-testid=login-browser]");
        await page.waitForSelector("[data-testid=browser-pending]");
        await settle(page, 400);
        await shot(page, "login-browser-waiting-en");
        await page.click("text=Cancel");
        await page.fill("[data-testid=login-password]", environment.djPassword);
        await page.click("[data-testid=login-submit]");
        await page.waitForSelector("[data-testid=picker]");
        await settle(page, 600);
        await shot(page, "picker-en");
      }
      await context.close();
    }
  });

  it(
    "captures the empty console, then a populated one in several themes and languages",
    { timeout: 400_000 },
    async () => {
      const empty = await newContext("shots-empty", { locale: "en" });
      const emptyPage = await empty.newPage();
      await login(emptyPage, "shots-empty");
      await enter(emptyPage);
      await settle(emptyPage);
      await shot(emptyPage, "console-empty-en");
      const sessions = await api.asUser(djToken).call("djVenues");
      sessionId = sessions.venues[0]?.activeSessionId ?? "";
      expect(sessionId).not.toBe("");

      const dj = api.asUser(djToken);
      const pendingSpecs: [
        [string, string],
        { table?: string; note?: string; dedicatedTo?: string },
      ][] = [
        [
          ["The Weeknd", "Blinding Lights"],
          { table: "Table 7", dedicatedTo: "Aziz", note: "This is our song!" },
        ],
        [["Dua Lipa", "Don't Start Now"], { table: "Table 3", note: "Please play it a bit later" }],
        [["Daft Punk", "One More Time"], { table: "Table 5" }],
        [["David Guetta", "Titanium"], { table: "Table 2", dedicatedTo: "Sardor" }],
        [["Тима Белорусских", "Мокрые кроссовки"], { table: "Bar" }],
      ];
      const queueSpecs: [[string, string], { table?: string; dedicatedTo?: string }][] = [
        [["Laylo", "Kechqurun"], { table: "Table 2" }],
        [["Timur Soul", "Yulduzlar"], { table: "Table 9", dedicatedTo: "Madina" }],
        [["Ozod Nilufar", "Oydin kecha"], { table: "Table 6" }],
        [["Eurythmics", "Sweet Dreams"], { table: "Table 1" }],
        [["Ed Sheeran", "Shape of You"], { table: "Table 4" }],
        [["Shahzoda", "Sevaman"], { table: "Table 8" }],
      ];
      const playedSpecs: [[string, string], { table?: string }][] = [
        [["Guns N' Roses", "Sweet Child O' Mine"], { table: "Table 3" }],
        [["Daft Punk", "Get Lucky"], { table: "Table 5" }],
      ];

      for (const [song, extra] of playedSpecs) {
        const request = await orderTrack(song, extra);
        await dj.call("djRequestAccept", { params: { id: request.id } });
        await dj.call("djRequestPlay", { params: { id: request.id } });
      }
      const queueIds: string[] = [];
      for (const [song, extra] of queueSpecs) {
        const request = await orderTrack(song, extra);
        await dj.call("djRequestAccept", { params: { id: request.id } });
        queueIds.push(request.id);
      }
      queueIds.shift();
      const onAirTrack = await api.catalogTrack("Dua Lipa", "Levitating");
      await dj.call("djNowPlayingSet", {
        params: { sessionId },
        body: {
          title: onAirTrack?.title ?? "Levitating",
          artist: onAirTrack?.artist ?? "Dua Lipa",
          artworkUrl: onAirTrack?.artworkUrl ?? null,
          durationSec: onAirTrack?.durationSec ?? 203,
          bpm: 103,
          key: "6B",
          source: "serato",
          startedAt: new Date(Date.now() - 87_000).toISOString(),
        },
      });
      for (const [song, extra] of pendingSpecs) await orderTrack(song, extra);
      const voted = (await api.venueState()).pending[0];
      if (voted) {
        const guestA = await api.anonymous.call("guestJoin", {
          params: { slug: environment.venueSlug },
          body: { deviceId: "voter-device-aaaa" },
        });
        await api
          .asUser(guestA.guestToken)
          .call("requestVote", { params: { id: voted.id } })
          .catch(() => undefined);
      }

      await emptyPage.waitForSelector("[data-panel=incoming] [data-request-id]");
      await settle(emptyPage, 2500);
      await shot(emptyPage, "console-populated-en");
      await emptyPage.keyboard.press("Control+k");
      await emptyPage.waitForSelector("[role=combobox]");
      await settle(emptyPage, 500);
      await shot(emptyPage, "console-palette-en");
      await emptyPage.keyboard.press("Escape");
      await settle(emptyPage, 400);
      await emptyPage.locator("[data-panel=incoming] [data-action=decline]").first().click();
      await emptyPage.waitForSelector("[data-testid=decline-confirm]");
      await settle(emptyPage, 500);
      await shot(emptyPage, "console-decline-en");
      await emptyPage.keyboard.press("Escape");
      await empty.close();

      for (const [locale, name] of [
        ["ru", "console-populated-ru"],
        ["uz", "console-populated-uz"],
      ] as const) {
        const context = await newContext(`shots-${name}`, { locale });
        const page = await context.newPage();
        await login(page, `shots-${name}`);
        await enter(page);
        await page.waitForSelector("[data-panel=incoming] [data-request-id]");
        await settle(page, 2500);
        await shot(page, name);
        await context.close();
      }

      const booth = await newContext("shots-booth", { locale: "en", boothMode: true });
      const boothPage = await booth.newPage();
      await login(boothPage, "shots-booth");
      await enter(boothPage);
      await boothPage.waitForSelector("[data-panel=incoming] [data-request-id]");
      await settle(boothPage, 2500);
      await shot(boothPage, "console-booth-en");
      await booth.close();

      const large = await newContext("shots-large", { locale: "en", largeTargets: true });
      const largePage = await large.newPage();
      await login(largePage, "shots-large");
      await enter(largePage);
      await largePage.waitForSelector("[data-panel=incoming] [data-request-id]");
      await settle(largePage, 2500);
      await shot(largePage, "console-large-targets-en");
      await large.close();

      for (const [theme, locale] of [
        ["lounge", "uz"],
        ["cafe", "ru"],
      ] as const) {
        await api
          .asUser(ownerToken)
          .call("adminVenueUpdate", { params: { venueId }, body: { theme } });
        const context = await newContext(`shots-${theme}`, { locale });
        const page = await context.newPage();
        await login(page, `shots-${theme}`);
        await enter(page);
        await page.waitForSelector("[data-panel=incoming] [data-request-id]");
        await settle(page, 2500);
        await shot(page, `console-${theme}-${locale}`);
        await context.close();
      }
      await api
        .asUser(ownerToken)
        .call("adminVenueUpdate", { params: { venueId }, body: { theme: "club" } });
    },
  );

  it("captures the offline state", async () => {
    const context = await newContext("shots-offline", { locale: "en" });
    const page = await context.newPage();
    await login(page, "shots-offline");
    await enter(page);
    await page.waitForSelector("[data-panel=incoming] [data-request-id]");
    await settle(page, 1500);
    await context.setOffline(true);
    await page.locator("[data-panel=incoming] [data-action=accept]").first().click();
    await page.locator("[data-panel=incoming] [data-action=accept]").first().click();
    await page.waitForSelector("[data-testid=offline-banner][data-mode=offline]");
    await settle(page, 800);
    await shot(page, "console-offline-en");
    await context.setOffline(false);
    await page.waitForSelector("[data-testid=offline-banner]", {
      state: "detached",
      timeout: 20_000,
    });
    await context.close();
  });

  it("captures every settings tab", async () => {
    const context = await newContext("shots-settings", { locale: "en" });
    const page = await context.newPage();
    await login(page, "shots-settings");
    await enter(page);
    await page.click("[data-testid=settings-button]");
    await page.waitForSelector("[data-testid=settings]");
    await settle(page, 600);
    await shot(page, "settings-general-en");

    await page.click("[data-testid=tab-hardware]");
    await page.click("[data-testid=toggle-simulator]");
    await page.click("[data-testid=toggle-traktor]");
    await page.click("[data-testid=toggle-prolink]");
    await page.click("[data-testid=toggle-serato]");
    await page.waitForSelector("[data-testid=status-simulator]");
    await settle(page, 1200);
    await shot(page, "settings-hardware-en");
    await page.evaluate(() =>
      document.querySelector("[data-testid=settings] .overflow-y-auto")?.scrollTo(0, 900),
    );
    await settle(page, 400);
    await shot(page, "settings-hardware-more-en");

    await page.click("[data-testid=tab-midi]");
    await page.waitForSelector("[data-testid=midi-devices]");
    await settle(page, 600);
    await shot(page, "settings-midi-en");
    await page.click("[data-testid=preset-pioneer-ddj-flx4]");
    await settle(page, 600);
    await shot(page, "settings-midi-preset-en");

    await page.click("[data-testid=tab-stage]");
    await settle(page, 500);
    await shot(page, "settings-stage-en");

    await page.click("[data-testid=tab-updates]");
    await settle(page, 500);
    await shot(page, "settings-updates-en");

    await page.click("[data-testid=tab-general]");
    await page.click("[data-testid=language-ru]");
    await settle(page, 500);
    await shot(page, "settings-general-ru");
    await page.click("[data-testid=tab-hardware]");
    await settle(page, 500);
    await shot(page, "settings-hardware-ru");
    await context.close();
  });

  it("captures the stage window in all themes and languages", { timeout: 300_000 }, async () => {
    const context = await newContext(
      "shots-stage",
      { locale: "en" },
      { width: 1920, height: 1080 },
    );
    const consolePage = await context.newPage();
    await login(consolePage, "shots-stage");
    await enter(consolePage);
    await consolePage.waitForSelector("[data-panel=incoming] [data-request-id]");
    await settle(consolePage, 1500);
    const stage = await context.newPage();
    await stage.goto(shimAddress(environment, "shots-stage", "/stage"));
    await stage.waitForSelector("[data-testid=stage]");

    const combos: [string, Locale][] = [
      ["club", "en"],
      ["club", "ru"],
      ["club", "uz"],
      ["lounge", "en"],
      ["lounge", "ru"],
      ["lounge", "uz"],
      ["cafe", "en"],
      ["cafe", "ru"],
      ["cafe", "uz"],
    ];
    const diagonal = new Set(["club-uz", "lounge-ru", "cafe-en"]);
    for (const [theme, locale] of combos) {
      await consolePage.evaluate(
        ([nextTheme, nextLocale]) =>
          window.__joyShim?.bridge.settings.update({
            locale: nextLocale as "uz" | "ru" | "en",
            stage: { theme: nextTheme as "club" | "lounge" | "cafe" },
          }),
        [theme, locale],
      );
      await stage.waitForFunction(
        (expected) =>
          document.querySelector("[data-testid=stage]")?.getAttribute("data-theme-active") ===
          expected,
        theme,
      );
      await settle(stage, 1800);
      const name = `stage-${theme}-${locale}`;
      await shot(
        stage,
        name,
        diagonal.has(`${theme}-${locale}`)
          ? outputDirectory
          : extraDirectory || join(outputDirectory, "..", "desktop-extra-unused"),
      );
    }

    await consolePage.evaluate(() =>
      window.__joyShim?.bridge.settings.update({ locale: "en", stage: { theme: "club" } }),
    );
    await api.asUser(djToken).call("djNowPlayingClear", { params: { sessionId } });
    await settle(stage, 1800);
    await shot(stage, "stage-idle-club-en");
    await context.close();
  });
});
