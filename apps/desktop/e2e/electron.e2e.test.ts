import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { _electron as electron } from "playwright-core";
import sharp from "sharp";
import type { ElectronApplication, Page } from "playwright-core";
import { createTestApi } from "./support/api";
import { expectContains, expectCount, expectVisible } from "./support/expect";
import { desktopRoot, repositoryRoot } from "./support/services";

const environment = inject("e2e");
const api = createTestApi(environment);
const electronBinary = join(desktopRoot, "node_modules/electron/dist/electron");
const hasXvfb = spawnSync("which", ["Xvfb"]).status === 0;
const runnable = hasXvfb && existsSync(electronBinary);
const screenshotDirectory =
  process.env.SCREENSHOT_DIR ?? join(repositoryRoot, "docs/design/desktop");

let application: ElectronApplication;
let page: Page;
let userData = "";
let djToken = "";

async function saveShot(target: Page, name: string): Promise<void> {
  mkdirSync(screenshotDirectory, { recursive: true });
  const raw = await target.screenshot();
  await sharp(raw)
    .png({ palette: true, quality: 90, effort: 8, compressionLevel: 9 })
    .toFile(join(screenshotDirectory, `${name}.png`));
}

let xvfb: ChildProcess | null = null;
let display = "";

async function startDisplay(): Promise<string> {
  const number = 100 + Math.floor(Math.random() * 400);
  const name = `:${number}`;
  xvfb = spawn("Xvfb", [name, "-screen", "0", "1920x1200x24", "-nolisten", "tcp"], {
    stdio: "ignore",
  });
  const socket = `/tmp/.X11-unix/X${number}`;
  for (let attempt = 0; attempt < 100 && !existsSync(socket); attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return name;
}

function launchArguments(extra: string[] = []): string[] {
  return ["--no-sandbox", "--disable-gpu", desktopRoot, ...extra];
}

describe.skipIf(!runnable)("real Electron app", () => {
  beforeAll(async () => {
    const build = spawnSync("pnpm", ["exec", "electron-vite", "build"], {
      cwd: desktopRoot,
      encoding: "utf8",
    });
    if (build.status !== 0)
      throw new Error(`electron-vite build failed:\n${build.stdout}\n${build.stderr}`);
    userData = mkdtempSync(join(tmpdir(), "joy-electron-"));
    writeFileSync(join(userData, "settings.json"), JSON.stringify({ locale: "en" }));
    djToken = (await api.djLogin()).accessToken;
    await api.endActiveSession(djToken);
    display = await startDisplay();
    application = await electron.launch({
      executablePath: electronBinary,
      args: launchArguments(),
      env: {
        ...process.env,
        DISPLAY: display,
        JOYMUSIC_USER_DATA: userData,
        JOYMUSIC_DISABLE_UPDATES: "1",
        API_URL: environment.apiUrl,
        ADMIN_URL: "http://127.0.0.1:5173",
        WEB_URL: "http://localhost:3000",
      },
      timeout: 60_000,
    });
    page = await application.firstWindow();
    await page.waitForSelector("[data-testid=login]", { timeout: 30_000 });
  }, 240_000);

  afterAll(async () => {
    await application?.close().catch(() => undefined);
    xvfb?.kill("SIGTERM");
    if (userData) rmSync(userData, { recursive: true, force: true });
  });

  it("loads the built renderer from the app protocol with a hardened window", async () => {
    expect(page.url()).toMatch(/^joy:\/\/app\/index\.html#\/login/u);
    const globals = await page.evaluate(() => ({
      bridge: typeof (window as unknown as { joy?: unknown }).joy,
      require: typeof (window as unknown as { require?: unknown }).require,
      process: typeof (window as unknown as { process?: unknown }).process,
    }));
    expect(globals).toEqual({ bridge: "object", require: "undefined", process: "undefined" });
    const preferences = await application.evaluate(({ BrowserWindow }) => {
      const contents = BrowserWindow.getAllWindows()[0]?.webContents;
      const value = (
        contents as unknown as { getLastWebPreferences(): Record<string, unknown> } | undefined
      )?.getLastWebPreferences();
      return {
        contextIsolation: value?.contextIsolation,
        sandbox: value?.sandbox,
        nodeIntegration: value?.nodeIntegration,
        webSecurity: value?.webSecurity,
      };
    });
    expect(preferences).toEqual({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    });
    const policy = await page.evaluate(async () => {
      const response = await fetch(window.location.href);
      return response.headers.get("content-security-policy");
    });
    expect(policy).toContain("script-src 'self'");
    expect(policy).not.toContain("unsafe-eval");
    expect(policy).toContain("connect-src 'self'");
  });

  it("blocks navigation and popups", async () => {
    const popup = await page.evaluate(() => window.open("file:///etc/passwd") === null);
    expect(popup).toBe(true);
    const verdicts = await application.evaluate(({ BrowserWindow }) => {
      const contents = BrowserWindow.getAllWindows()[0]?.webContents;
      const attempt = (url: string) => {
        const event = {
          prevented: false,
          preventDefault() {
            this.prevented = true;
          },
        };
        contents?.emit("will-navigate", event, url);
        return event.prevented;
      };
      return {
        external: attempt("https://example.com/"),
        file: attempt("file:///etc/passwd"),
        own: attempt("joy://app/index.html#/settings/general"),
      };
    });
    expect(verdicts).toEqual({ external: true, file: true, own: false });
    expect(page.url().startsWith("joy://app/")).toBe(true);
    expect(application.windows()).toHaveLength(1);
  });

  it("finishes the browser login from a joymusic:// link handed to a second instance", async () => {
    await application.evaluate(({ shell }) => {
      (globalThis as unknown as { __opened: string | null }).__opened = null;
      shell.openExternal = async (url: string) => {
        (globalThis as unknown as { __opened: string | null }).__opened = url;
      };
    });
    await page.click("[data-testid=login-browser]");
    await page.waitForSelector("[data-testid=browser-pending]");
    const opened = await application.evaluate(
      () => (globalThis as unknown as { __opened: string | null }).__opened,
    );
    expect(opened).not.toBeNull();
    const url = new URL(opened as string);
    expect(url.origin).toBe("http://127.0.0.1:5173");
    const dj = await api.djLogin();
    const authorized = await api.asUser(dj.accessToken).call("authDesktopAuthorize", {
      body: {
        codeChallenge: url.searchParams.get("challenge") as string,
        state: url.searchParams.get("state") as string,
      },
    });
    const second = spawn(
      electronBinary,
      launchArguments([`joymusic://auth?code=${authorized.code}&state=${authorized.state}`]),
      {
        env: {
          ...process.env,
          DISPLAY: display,
          JOYMUSIC_USER_DATA: userData,
          API_URL: environment.apiUrl,
        },
        stdio: "ignore",
      },
    );
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        second.kill("SIGKILL");
        resolve();
      }, 30_000);
      second.on("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    await page.waitForSelector("[data-testid=picker]", { timeout: 20_000 });
    await page.click("[data-testid=sign-out]");
    await page.waitForSelector("[data-testid=login]");
  });

  it("signs in with a password, starts a session and shows live requests", async () => {
    await page.fill("[data-testid=login-email]", environment.djEmail);
    await page.fill("[data-testid=login-password]", environment.djPassword);
    await page.click("[data-testid=login-submit]");
    await page.waitForSelector("[data-testid=picker]");
    await page.click(`[data-testid=enter-${environment.venueSlug}]`);
    await page.waitForSelector("[data-testid=console]");
    await page.waitForSelector("[data-testid=realtime-chip][data-state=open]", { timeout: 15_000 });

    const startedAt = Date.now();
    const { request } = await api.guestRequest({
      artist: "Shahzoda",
      title: "Sevaman",
      dedicatedTo: "Aziz",
      note: "From the real Electron test",
    });
    await page.waitForSelector(`[data-request-id="${request.id}"]`, { timeout: 2000 });
    expect(Date.now() - startedAt).toBeLessThan(2000);
    await page.locator(`[data-request-id="${request.id}"] [data-action=accept]`).click();
    await expectVisible(page.locator(`[data-queue-id="${request.id}"]`));
    const venues = await api.asUser(djToken).call("djVenues");
    const sessionId = venues.venues[0]?.activeSessionId ?? "";
    await expect
      .poll(async () => (await api.djState(djToken, sessionId)).queue.map((item) => item.id))
      .toContain(request.id);
  });

  it("runs the real hardware adapters and the simulator through the main process", async () => {
    await page.click("[data-testid=settings-button]");
    await page.click("[data-testid=tab-hardware]");
    await page.click("[data-testid=toggle-serato]");
    await page.click("[data-testid=toggle-prolink]");
    await page.click("[data-testid=toggle-simulator]");
    await expectVisible(page.locator("[data-testid=status-serato]"));
    await expectContains(page.locator("[data-testid=adapter-serato]"), "not found", 8000);
    await expectVisible(page.locator("[data-testid=status-prolink]"));
    await page.waitForTimeout(1500);
    await page.evaluate(() =>
      document.querySelector("[data-testid=settings] .overflow-y-auto")?.scrollTo(0, 240),
    );
    await saveShot(page, "electron-hardware-en");
    await page.click("[data-testid=settings-back]");
    await page.waitForSelector("[data-testid=console]");
    await expectContains(page.locator("[data-testid=now-playing]"), "Sevaman", 15_000);
    await expect
      .poll(async () => (await api.venueState()).nowPlaying?.title, { timeout: 10_000 })
      .toBe("Sevaman");
  });

  it("opens a kiosk stage window and keeps it in sync", async () => {
    await page.click("[data-testid=stage-toggle]");
    await expect.poll(() => application.windows().length, { timeout: 15_000 }).toBe(2);
    const stage = application.windows().find((window) => window !== page) as Page;
    await stage.waitForSelector("[data-testid=stage]", { timeout: 15_000 });
    await expectContains(stage.locator("[data-testid=stage-url]"), "/v/joy-demo-club");
    await expectVisible(stage.locator("[data-testid=stage-qr]"));
    await expectContains(stage.locator("body"), "Sevaman", 10_000);
    const facts = await application.evaluate(({ BrowserWindow }) => {
      const windows = BrowserWindow.getAllWindows();
      const stageWindow = windows.find((window) => window.webContents.getURL().includes("#/stage"));
      return {
        kiosk: stageWindow?.isKiosk(),
        frame: stageWindow ? stageWindow.getBounds().width : 0,
        alwaysOnTop: stageWindow?.isAlwaysOnTop(),
      };
    });
    expect(facts.kiosk).toBe(true);
    expect(facts.alwaysOnTop).toBe(true);
    await stage.waitForTimeout(1500);
    await saveShot(stage, "electron-stage-window");
    await stage.keyboard.press("Escape");
    await stage.keyboard.press("F11");
    await stage.waitForTimeout(300);
    expect(application.windows()).toHaveLength(2);
    await page.click("[data-testid=stage-toggle]");
    await expect.poll(() => application.windows().length, { timeout: 15_000 }).toBe(1);
  });

  it("keeps every renderer in the sandbox and rejects unknown IPC input", async () => {
    const outcome = await page.evaluate(async () => {
      const bridge = (
        window as unknown as {
          joy: { api: { call(name: string, input?: unknown): Promise<unknown> } };
        }
      ).joy;
      return bridge.api.call("adminVenues", {});
    });
    expect(outcome).toMatchObject({ ok: false, error: { code: "validation_failed" } });
    const stageWindows = await application.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows().map(
        (window) =>
          (
            window.webContents as unknown as {
              getLastWebPreferences(): { sandbox?: boolean };
            }
          ).getLastWebPreferences().sandbox,
      ),
    );
    expect(stageWindows.every(Boolean)).toBe(true);
    await expectCount(page.locator("[data-testid=login]"), 0);
  });
});
