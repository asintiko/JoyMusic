import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { e2eEnvironment } from "./environment";
import { stubCatalog } from "./support/catalog";
import {
  djClient,
  endActiveSession,
  endSession,
  findRequest,
  scansOf,
  setRequestsOpen,
  slug,
  startSession,
  tableToken,
  type DjSession,
} from "./support/dj";

const environment = e2eEnvironment();
const venuePath = `/v/${slug}`;

test.describe.configure({ mode: "serial" });

let dj: DjSession;
let table: { token: string; scans: number };
let guestContext: BrowserContext;
let guest: Page;
let tvContext: BrowserContext;
let tv: Page;
let secondContext: BrowserContext;
let second: Page;

async function newGuest(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    baseURL: environment.webUrl,
    locale: "en-US",
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
  });
  await stubCatalog(context, environment.webUrl);
  return { context, page: await context.newPage() };
}

async function search(page: Page, query: string) {
  await page.getByTestId("open-search").click();
  const overlay = page.getByTestId("search-overlay");
  await expect(overlay).toBeVisible();
  await overlay.getByRole("searchbox").fill(query);
  await expect(page.getByTestId("search-count")).toBeVisible();
}

async function requestTrack(
  page: Page,
  query: string,
  title: string,
  extras: { dedication?: string; note?: string } = {},
) {
  await search(page, query);
  await page
    .getByTestId("track-result")
    .filter({ hasText: title })
    .getByRole("button", { name: /^Request:/ })
    .click();
  if (extras.dedication) await page.locator("input[name=dedicatedTo]").fill(extras.dedication);
  if (extras.note) await page.locator("textarea[name=note]").fill(extras.note);
  await page.getByTestId("request-submit").click();
}

async function closeSearch(page: Page) {
  await page.getByTestId("search-close").click();
  await expect(page.getByTestId("search-overlay")).toHaveCount(0);
}

test.beforeAll(async ({ browser }) => {
  dj = await djClient();
  await endActiveSession(dj);
  table = await tableToken("Table 4");
  const primary = await newGuest(browser);
  guestContext = primary.context;
  guest = primary.page;
  const other = await newGuest(browser);
  secondContext = other.context;
  second = other.page;
  tvContext = await browser.newContext({
    baseURL: environment.webUrl,
    viewport: { width: 1920, height: 1080 },
    locale: "en-US",
  });
  tv = await tvContext.newPage();
});

test.afterAll(async () => {
  await endActiveSession(dj);
  await Promise.all([guestContext?.close(), secondContext?.close(), tvContext?.close()]);
});

test("scanning the QR joins as a guest and shows the waiting state", async () => {
  const scansBefore = await scansOf("Table 4");
  await guest.goto(`${venuePath}?t=${table.token}`);
  await expect(guest.getByRole("heading", { name: "Joy Demo Club" })).toBeVisible();
  await expect(guest.getByText("No DJ yet")).toBeVisible();
  await expect(guest.getByTestId("table-label")).toHaveText("Table 4");
  await expect(guest.getByTestId("dock-closed")).toContainText("hasn’t started");
  await expect.poll(() => guest.url()).not.toContain("t=");
  await expect.poll(() => scansOf("Table 4")).toBe(scansBefore + 1);

  const stored = await guest.evaluate(() => ({
    device: window.localStorage.getItem("jm:device-id"),
    session: window.localStorage.getItem(`jm:guest:${location.pathname.split("/").pop()}`),
    table: window.localStorage.getItem(`jm:table:${location.pathname.split("/").pop()}`),
  }));
  expect(stored.device?.length).toBeGreaterThanOrEqual(8);
  expect(stored.session).toContain("token");
  expect(stored.table).toBe(table.token);

  await guest.reload();
  await expect(guest.getByTestId("table-label")).toHaveText("Table 4");
  expect(await scansOf("Table 4")).toBe(scansBefore + 1);
});

test("the TV screen shows the waiting mode with a real QR code", async () => {
  await tv.goto(`/tv/${slug}?locale=en`);
  await expect(tv.getByTestId("tv-root")).toHaveAttribute("data-mode", "waiting");
  await expect(tv.getByTestId("tv-idle-title")).toHaveText("The DJ starts soon");
  const qr = tv.getByTestId("tv-qr");
  await expect(qr.locator("svg")).toBeVisible();
  await expect(qr).toHaveAttribute("aria-label", `${new URL(environment.webUrl).host}/v/${slug}`);
});

test("the DJ starts a session and the guest page updates live", async () => {
  await startSession(dj);
  await expect(guest.getByText("No DJ yet")).toHaveCount(0);
  await expect(guest.getByText("Picking the next track")).toBeVisible();
  await expect(guest.getByTestId("open-search")).toBeVisible();
  await expect(tv.getByTestId("tv-root")).toHaveAttribute("data-mode", "idle");
});

test("search, request with a dedication, and follow it live through accept and play", async () => {
  await requestTrack(guest, "shahzoda", "Yomgir", {
    dedication: "Aziz",
    note: "Happy birthday",
  });
  await expect(guest.getByTestId("toast").first()).toContainText("Request received");
  await expect(
    guest
      .getByTestId("track-result")
      .filter({ hasText: "Yomgir" })
      .getByRole("button", { name: "Already requested" }),
  ).toBeDisabled();
  await closeSearch(guest);

  await expect(guest.getByTestId("open-mine")).toBeVisible();
  await guest.getByTestId("open-mine").click();
  await expect(guest.getByTestId("my-request")).toHaveAttribute("data-status", "pending");
  await guest.keyboard.press("Escape");

  const pending = await findRequest(dj, "Yomgir");
  expect(pending.note).toBe("Happy birthday");
  expect(pending.dedicatedTo).toBe("Aziz");

  await dj.api.call("djRequestAccept", { params: { id: pending.id } });
  await expect(guest.getByTestId("toast").filter({ hasText: "queued your request" })).toBeVisible();
  const row = guest.getByTestId("queue-row").filter({ hasText: "Yomgir" });
  await expect(row).toBeVisible();
  await expect(row.getByTestId("mine-badge")).toBeVisible();
  await expect(row).toContainText("For Aziz");
  await expect(tv.getByTestId("tv-upcoming")).toContainText("Yomgir");
  await expect(tv.getByTestId("tv-upcoming")).toContainText("For Aziz");

  await guest.getByTestId("open-mine").click();
  await expect(guest.getByTestId("my-request")).toHaveAttribute("data-status", "accepted");
  await expect(guest.getByTestId("my-request")).toContainText("#1");
  await guest.keyboard.press("Escape");

  await dj.api.call("djRequestPlay", { params: { id: pending.id } });
  if (!dj.sessionId) throw new Error("no session");
  await dj.api.call("djNowPlayingSet", {
    params: { sessionId: dj.sessionId },
    body: {
      title: "Yomgir",
      artist: "Shahzoda",
      durationSec: 200,
      bpm: 118,
      key: "8A",
      source: "request",
      requestId: pending.id,
    },
  });
  await expect(guest.getByRole("heading", { name: "Yomgir" })).toBeVisible();
  await expect(guest.getByTestId("now-playing-mine")).toBeVisible();
  await expect(guest.getByText("For Aziz").first()).toBeVisible();
  await expect(guest.getByRole("progressbar")).toBeVisible();
  await expect
    .poll(async () => Number(await guest.getByRole("progressbar").getAttribute("aria-valuenow")))
    .toBeGreaterThanOrEqual(0);

  await expect(tv.getByTestId("tv-root")).toHaveAttribute("data-mode", "playing");
  await expect(tv.getByRole("heading", { name: "Yomgir" })).toBeVisible();
  await expect(tv.getByText("118")).toBeVisible();
  await expect(tv.getByText("For Aziz").first()).toBeVisible();
});

test("a second device requesting the same track adds a vote instead of a duplicate", async () => {
  await second.goto(venuePath);
  await expect(second.getByRole("heading", { name: "Yomgir" })).toBeVisible();
  await requestTrack(guest, "levitating", "Levitating");
  await expect(guest.getByTestId("toast").first()).toContainText("Request received");
  await closeSearch(guest);

  await requestTrack(second, "levitating", "Levitating");
  await expect(second.getByTestId("toast").first()).toContainText("Your vote is added");
  await closeSearch(second);
  await expect(second.getByTestId("mine-badge")).toHaveCount(1);
  const pending = await findRequest(dj, "Levitating");
  expect(pending.votes).toBe(2);
});

test("guests vote on waiting requests from the list", async () => {
  await dj.api.call("djQueueAdd", {
    params: { sessionId: dj.sessionId ?? "" },
    body: { freeText: { artist: "Laylo", title: "Kechqurun" }, dedicatedTo: "Madina" },
  });
  const list = guest.getByTestId("up-next");
  await expect(list).toContainText("Kechqurun");
  const row = guest.getByTestId("queue-row").filter({ hasText: "Kechqurun" });
  await row.getByTestId("vote-button").click();
  await expect(guest.getByTestId("toast").filter({ hasText: "Your vote is added" })).toBeVisible();
  await expect(row.getByTestId("mine-badge")).toBeVisible();
  await expect(tv.getByTestId("tv-dedication")).toContainText("For Madina");
});

test("hitting the request limit shows a friendly message with a countdown", async () => {
  await requestTrack(guest, "habibi", "Habibi");
  await expect(guest.getByTestId("toast").first()).toContainText("Request received");
  await closeSearch(guest);

  await requestTrack(guest, "maqtanchoq", "Maqtanchoq");
  const failure = guest.getByTestId("request-failure");
  await expect(failure).toHaveAttribute("data-failure", "limit");
  await expect(failure).toContainText("Request limit reached");
  await expect(failure).toContainText("3");
  await expect(guest.getByTestId("request-submit")).toBeDisabled();
  await expect(guest.getByTestId("request-submit")).toContainText(/Try again in \d+:\d\d/);
  await guest.keyboard.press("Escape");
});

test("closing requests updates the guest dock and the TV instantly", async () => {
  await setRequestsOpen(dj, false);
  await expect(guest.getByTestId("dock-closed")).toContainText("Requests are closed");
  await expect(guest.getByTestId("open-search")).toHaveCount(0);
  await expect(tv.getByTestId("tv-status")).toContainText("Requests closed");
  await setRequestsOpen(dj, true);
  await expect(guest.getByTestId("open-search")).toBeVisible();
  await expect(tv.getByTestId("tv-status")).toContainText("Requests open");
});

test("the offline banner appears and clears", async () => {
  await guestContext.setOffline(true);
  await expect(guest.getByTestId("offline-banner")).toHaveAttribute("data-online", "false");
  await guestContext.setOffline(false);
  await expect(guest.getByTestId("offline-banner")).toHaveAttribute("data-online", "true");
  await expect(guest.getByTestId("offline-banner")).toHaveCount(0);
});

test("the language switch persists and localises the page", async () => {
  await guest.getByRole("button", { name: "ru", exact: true }).click();
  await expect(guest.getByTestId("open-search")).toContainText("Найти трек");
  await guest.reload();
  await expect(guest.getByTestId("open-search")).toContainText("Найти трек");
  await guest.getByRole("button", { name: "uz", exact: true }).click();
  await expect(guest.getByTestId("open-search")).toContainText("Qoʻshiq qidirish");
  await guest.getByRole("button", { name: "en", exact: true }).click();
  await expect(guest.getByTestId("open-search")).toContainText("Find a track");
});

test("ending the session returns everyone to the waiting state", async () => {
  await endSession(dj);
  await expect(guest.getByText("No DJ yet")).toBeVisible();
  await expect(tv.getByTestId("tv-root")).toHaveAttribute("data-mode", "waiting");
});

test("an unknown venue shows a friendly not found page", async ({ page }) => {
  const response = await page.goto("/v/does-not-exist");
  expect(response?.status()).toBe(404);
  await expect(page.getByText("Venue not found")).toBeVisible();
});
