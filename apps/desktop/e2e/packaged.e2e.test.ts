import { spawn, spawnSync } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";
import { _electron as electron } from "playwright-core";
import type { ElectronApplication, Page } from "playwright-core";
import { desktopRoot } from "./support/services";

const environment = inject("e2e");
const packagedBinary = join(desktopRoot, "release/linux-unpacked/Joy Music");
const runnable = spawnSync("which", ["Xvfb"]).status === 0 && existsSync(packagedBinary);

let application: ElectronApplication;
let page: Page;
let xvfb: ChildProcess | null = null;
let userData = "";

describe.skipIf(!runnable)("packaged build from electron-builder --dir", () => {
  beforeAll(async () => {
    const number = 500 + Math.floor(Math.random() * 400);
    xvfb = spawn("Xvfb", [`:${number}`, "-screen", "0", "1600x1000x24", "-nolisten", "tcp"], {
      stdio: "ignore",
    });
    for (let attempt = 0; attempt < 100 && !existsSync(`/tmp/.X11-unix/X${number}`); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    userData = mkdtempSync(join(tmpdir(), "joy-packaged-"));
    application = await electron.launch({
      executablePath: packagedBinary,
      args: ["--no-sandbox", "--disable-gpu"],
      env: {
        ...process.env,
        DISPLAY: `:${number}`,
        JOYMUSIC_USER_DATA: userData,
        API_URL: environment.apiUrl,
      },
      timeout: 60_000,
    });
    page = await application.firstWindow();
    await page.waitForSelector("[data-testid=login]", { timeout: 30_000 });
  }, 120_000);

  afterAll(async () => {
    await application?.close().catch(() => undefined);
    xvfb?.kill("SIGTERM");
    if (userData) rmSync(userData, { recursive: true, force: true });
  });

  it("runs as a packaged app with dev tools locked and the updater armed", async () => {
    const facts = await application.evaluate(({ app, BrowserWindow }) => ({
      packaged: app.isPackaged,
      name: app.getName(),
      devTools:
        (
          BrowserWindow.getAllWindows()[0]?.webContents as unknown as {
            getLastWebPreferences(): { devTools?: boolean };
          }
        ).getLastWebPreferences().devTools === true,
    }));
    expect(facts).toEqual({ packaged: true, name: "Joy Music", devTools: false });
    const updates = await page.evaluate(() =>
      (
        window as unknown as { joy: { topics: { get(name: string): Promise<{ status: string }> } } }
      ).joy.topics.get("updates"),
    );
    expect(updates.status).toBe("idle");
  });

  it("loads both optional adapters modules from the archive without crashing", async () => {
    await page.fill("[data-testid=login-email]", environment.djEmail);
    await page.fill("[data-testid=login-password]", environment.djPassword);
    await page.click("[data-testid=login-submit]");
    await page.waitForSelector("[data-testid=picker]");
    await page.click("[data-testid=picker-settings]");
    await page.click("[data-testid=tab-hardware]");
    await page.click("[data-testid=toggle-stagelinq]");
    await page.click("[data-testid=toggle-prolink]");
    await page.waitForSelector("[data-testid=status-stagelinq]");
    await page.waitForSelector("[data-testid=status-prolink]");
    const states = await page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-testid^=status-]")).map(
        (node) => node.textContent,
      ),
    );
    expect(states).toHaveLength(2);
  });
});
