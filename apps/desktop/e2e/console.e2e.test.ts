import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import type { Browser } from "playwright-core";
import { createTestApi } from "./support/api";
import { launchBrowser, openApp, shimAddress, signIn } from "./support/browser";
import type { OpenedApp } from "./support/browser";
import {
  expectAttribute,
  expectContains,
  expectCount,
  expectExactText,
  expectGone,
  expectVisible,
} from "./support/expect";
import { seedSettings } from "./support/settings";

const environment = inject("e2e");
const api = createTestApi(environment);

let browser: Browser;
let djToken = "";

beforeAll(async () => {
  browser = await launchBrowser();
  const login = await api.djLogin();
  djToken = login.accessToken;
  await api.endActiveSession(djToken);
});

afterAll(async () => {
  await browser?.close();
});

describe("sign in", () => {
  it("shows a clear error for a wrong password", async () => {
    const { context, page } = await openApp(browser, environment, "wrong-password");
    await seedSettings(context, "wrong-password", { locale: "en" });
    await page.reload();
    await page.waitForSelector("[data-testid=login]");
    await page.fill("[data-testid=login-email]", environment.djEmail);
    await page.fill("[data-testid=login-password]", "not-the-password");
    await page.click("[data-testid=login-submit]");
    await expectExactText(page.locator("[data-testid=login-error]"), "Wrong email or password");
    await context.close();
  });

  it("completes the PKCE browser flow through the joymusic:// deep link", async () => {
    const { context, page } = await openApp(browser, environment, "pkce");
    await seedSettings(context, "pkce", { locale: "en" });
    await page.reload();
    await page.click("[data-testid=login-browser]");
    await page.waitForSelector("[data-testid=browser-pending]");
    const opened = await page.evaluate(() => window.__joyShim?.lastOpenedUrl() ?? null);
    expect(opened).not.toBeNull();
    const url = new URL(opened as string);
    expect(url.pathname).toBe("/desktop/authorize");
    const state = url.searchParams.get("state") as string;
    const challenge = url.searchParams.get("challenge") as string;
    expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/u);

    const dj = await api.djLogin();
    const authorized = await api.asUser(dj.accessToken).call("authDesktopAuthorize", {
      body: { codeChallenge: challenge, state },
    });

    await page.evaluate(
      (link) => window.__joyShim?.deepLink(link),
      `joymusic://auth?code=${authorized.code}&state=wrong-state-value-000`,
    );
    await expectCount(page.locator("[data-testid=picker]"), 0);

    await page.evaluate(
      (link) => window.__joyShim?.deepLink(link),
      `joymusic://auth?code=${authorized.code}&state=${authorized.state}`,
    );
    await page.waitForSelector("[data-testid=picker]");
    await context.close();
  });
});

describe("console against the real API", () => {
  const namespace = "console";
  let page: OpenedApp["page"];
  let context: OpenedApp["context"];
  let sessionId = "";

  beforeAll(async () => {
    const seeded = await openApp(browser, environment, namespace);
    await seedSettings(seeded.context, namespace, { locale: "en" });
    await seeded.page.reload();
    await signIn(seeded.page, environment);
    await seeded.page.click(`[data-testid=enter-${environment.venueSlug}]`);
    await seeded.page.waitForSelector("[data-testid=console]");
    await seeded.page.waitForSelector("[data-testid=realtime-chip][data-state=open]");
    page = seeded.page;
    context = seeded.context;
    const venues = await api.asUser(djToken).call("djVenues");
    sessionId = venues.venues[0]?.activeSessionId ?? "";
    expect(sessionId).not.toBe("");
  });

  afterAll(async () => {
    await context?.close();
  });

  it("starts empty", async () => {
    await expectCount(page.locator("[data-panel=incoming] [data-request-id]"), 0);
    await expectVisible(page.getByText("No new requests"));
    await expectVisible(page.getByText("The queue is empty"));
    await expectVisible(page.getByText("Nothing is playing"));
  });

  it("shows a guest request in under a second", async () => {
    const startedAt = Date.now();
    const { request } = await api.guestRequest({
      artist: "Timur Soul",
      title: "Yulduzlar",
      note: "Happy birthday",
      dedicatedTo: "Aziz",
    });
    await page.waitForSelector(`[data-request-id="${request.id}"]`, { timeout: 1000 });
    const elapsed = Date.now() - startedAt;
    expect(elapsed).toBeLessThan(1000);
    const card = page.locator(`[data-request-id="${request.id}"]`);
    await expectContains(card, "Yulduzlar");
    await expectContains(card, "For Aziz");
    await expectContains(card, "Happy birthday");
    await expectExactText(page.locator("[data-testid=incoming-count]"), "1");
  });

  it("accepts a request with the button and with the A shortcut", async () => {
    const first = (await api.venueState()).pending[0];
    expect(first).toBeDefined();
    await page.locator(`[data-request-id="${first?.id}"] [data-action=accept]`).click();
    await expectVisible(page.locator(`[data-queue-id="${first?.id}"]`));
    await expect
      .poll(async () => (await api.djState(djToken, sessionId)).queue.map((item) => item.id))
      .toContain(first?.id);

    const { request } = await api.guestRequest({ artist: "Dua Lipa", title: "Levitating" });
    await page.waitForSelector(`[data-request-id="${request.id}"]`, { timeout: 2000 });
    await page.locator("body").click({ position: { x: 720, y: 450 } });
    await page.keyboard.press("a");
    await expectVisible(page.locator(`[data-queue-id="${request.id}"]`));
    await expect
      .poll(async () => (await api.djState(djToken, sessionId)).queue.map((item) => item.id))
      .toContain(request.id);
  });

  it("declines with a reason through the dialog", async () => {
    const { request } = await api.guestRequest({ artist: "Nobody", title: "Unwanted song" });
    await page.waitForSelector(`[data-request-id="${request.id}"]`, { timeout: 2000 });
    await page.locator(`[data-request-id="${request.id}"] [data-action=decline]`).click();
    await page.fill("[data-testid=decline-reason]", "Not tonight");
    await page.click("[data-testid=decline-confirm]");
    await expectGone(page.locator(`[data-request-id="${request.id}"]`));
    await expect
      .poll(async () => {
        const list = await api.asUser(djToken).call("djSessionState", { params: { sessionId } });
        return list.pending.some((item) => item.id === request.id);
      })
      .toBe(false);
  });

  it("puts a queued request on air and shows it as now playing", async () => {
    const queueRow = page.locator("[data-panel=queue] [data-queue-id]").first();
    const title = (await queueRow.locator("p").first().innerText()).trim();
    await queueRow.locator("[data-action=play]").click();
    await expectContains(page.locator("[data-testid=now-playing]"), title);
    await expect.poll(async () => (await api.venueState()).nowPlaying?.title).toBe(title);
    await page.click("[data-action=mark-played]");
    await expectVisible(page.getByText("Nothing is playing"));
    await expect.poll(async () => (await api.venueState()).nowPlaying).toBeNull();
  });

  it("reorders the queue by dragging and by keyboard", async () => {
    const created = [] as string[];
    for (const [artist, title] of [
      ["Alpha", "First one"],
      ["Beta", "Second one"],
      ["Gamma", "Third one"],
    ] as const) {
      const { request } = await api.guestRequest({ artist, title });
      await api.asUser(djToken).call("djRequestAccept", { params: { id: request.id } });
      created.push(request.id);
    }
    const [first, second, third] = created as [string, string, string];
    for (const id of created) {
      await page.waitForSelector(`[data-queue-id="${id}"]`, { timeout: 3000 });
    }

    const orderOnServer = async () =>
      (await api.djState(djToken, sessionId)).queue
        .map((item) => item.id)
        .filter((id) => created.includes(id));
    expect(await orderOnServer()).toEqual([first, second, third]);

    const handle = (id: string) => page.locator(`[data-queue-id="${id}"] [data-drag-handle]`);
    const from = await handle(third).boundingBox();
    const target = await page.locator(`[data-queue-id="${first}"]`).boundingBox();
    expect(from).not.toBeNull();
    expect(target).not.toBeNull();
    await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
    await page.mouse.down();
    await page.mouse.move(from!.x + 4, from!.y - 20, { steps: 6 });
    await page.mouse.move(from!.x + 4, target!.y + 4, { steps: 20 });
    await page.mouse.up();

    await expect.poll(orderOnServer, { timeout: 5000 }).toEqual([third, first, second]);

    await page.locator(`[data-queue-id="${second}"]`).click({ position: { x: 200, y: 12 } });
    await page.keyboard.press("Alt+ArrowUp");
    await expect.poll(orderOnServer, { timeout: 5000 }).toEqual([third, second, first]);
  });

  it("lets the simulator adapter set now playing and links the request", async () => {
    const { request } = await api.guestRequest({ artist: "Shahzoda", title: "Sevaman" });
    await api.asUser(djToken).call("djRequestAccept", { params: { id: request.id } });
    await page.waitForSelector(`[data-queue-id="${request.id}"]`, { timeout: 3000 });

    await page.click("[data-testid=settings-button]");
    await page.click("[data-testid=tab-hardware]");
    await page.click("[data-testid=toggle-simulator]");
    await expectVisible(page.locator("[data-testid=status-simulator]"));
    await page.click("[data-testid=settings-back]");
    await page.waitForSelector("[data-testid=console]");

    await expectContains(page.locator("[data-testid=now-playing]"), "Sevaman", 10_000);
    await expectVisible(page.locator("[data-testid=adapter-chip-simulator]"));
    await expect
      .poll(async () => (await api.venueState()).nowPlaying?.requestId, { timeout: 8000 })
      .toBe(request.id);
    const state = await api.venueState();
    expect(state.nowPlaying?.bpm).toBe(96);
    expect(state.nowPlaying?.key).toBe("8A");
  });

  it("opens and closes requests from the top bar", async () => {
    await page.click("[data-testid=requests-open-switch]");
    await expect.poll(async () => (await api.venueState()).venue.settings.requestsOpen).toBe(false);
    await expectVisible(page.getByText("Requests paused").first());
    await expect(api.guestRequest({ artist: "Late", title: "Too late" })).rejects.toMatchObject({
      code: "requests_closed",
    });
    await page.click("[data-testid=requests-open-switch]");
    await expect.poll(async () => (await api.venueState()).venue.settings.requestsOpen).toBe(true);
  });

  it("queues actions offline and replays them after reconnecting", async () => {
    const { request } = await api.guestRequest({ artist: "Offline", title: "While offline" });
    await page.waitForSelector(`[data-request-id="${request.id}"]`, { timeout: 2000 });

    await context.setOffline(true);
    await page.locator(`[data-request-id="${request.id}"] [data-action=accept]`).click();
    await expectVisible(page.locator("[data-testid=offline-banner]"));
    await expectAttribute(page.locator("[data-testid=offline-banner]"), "data-mode", "offline");
    await expectContains(page.locator("[data-testid=outbox-chip]"), "1");
    await expectVisible(page.locator(`[data-queue-id="${request.id}"]`));
    const stored = await page.evaluate(() =>
      window.localStorage.getItem("joy.shim.console.outbox.json"),
    );
    expect(stored).toContain(request.id);

    await context.setOffline(false);
    await expectGone(page.locator("[data-testid=offline-banner]"), 20_000);
    await expect
      .poll(async () => (await api.djState(djToken, sessionId)).queue.map((item) => item.id), {
        timeout: 10_000,
      })
      .toContain(request.id);
    await expectGone(page.locator("[data-testid=outbox-chip]"));
  });

  it("mirrors the live state on the stage window", async () => {
    const stage = await context.newPage();
    await stage.goto(shimAddress(environment, namespace, "/stage"));
    await stage.waitForSelector("[data-testid=stage]", { timeout: 10_000 });
    await expectExactText(
      stage.locator("[data-testid=stage-url]"),
      `localhost:3000/v/${environment.venueSlug}`,
    );
    await expectVisible(stage.locator("[data-testid=stage-qr]"));
    await expectVisible(stage.getByText("Sevaman"), 10_000);
    await stage.close();
  });

  it("ends the session and returns to the picker", async () => {
    await page.evaluate(() => window.__joyShim?.bridge.commands.retryOutbox());
    await page.keyboard.press("Escape");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    const endButton = page.getByRole("button", { name: "Commands" });
    await endButton.click();
    await page.keyboard.type("End session");
    await page.keyboard.press("Enter");
    await page.click("[data-testid=end-session-confirm]");
    await page.waitForSelector("[data-testid=picker]");
    const venues = await api.asUser(djToken).call("djVenues");
    expect(venues.venues[0]?.activeSessionId).toBeNull();
  });
});
