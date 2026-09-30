import { chromium } from "playwright-core";
import type { Browser, BrowserContext, Page } from "playwright-core";
import type { E2eEnvironment } from "./services";

export async function launchBrowser(): Promise<Browser> {
  return chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
}

export interface OpenedApp {
  context: BrowserContext;
  page: Page;
}

export function shimAddress(environment: E2eEnvironment, namespace: string, route = ""): string {
  const query = new URLSearchParams({ api: environment.apiUrl, ns: namespace });
  return `${environment.shimUrl}/?${query.toString()}${route ? `#${route}` : ""}`;
}

export async function openApp(
  browser: Browser,
  environment: E2eEnvironment,
  namespace: string,
  options: { width?: number; height?: number; colorScheme?: "dark" | "light" } = {},
): Promise<OpenedApp> {
  const context = await browser.newContext({
    viewport: { width: options.width ?? 1440, height: options.height ?? 900 },
    colorScheme: options.colorScheme ?? "dark",
  });
  const page = await context.newPage();
  await page.goto(shimAddress(environment, namespace));
  return { context, page };
}

export async function signIn(page: Page, environment: E2eEnvironment): Promise<void> {
  await page.waitForSelector("[data-testid=login]");
  await page.fill("[data-testid=login-email]", environment.djEmail);
  await page.fill("[data-testid=login-password]", environment.djPassword);
  await page.click("[data-testid=login-submit]");
  await page.waitForSelector("[data-testid=picker]");
}

export async function enterConsole(page: Page, environment: E2eEnvironment): Promise<void> {
  await page.click(`[data-testid=enter-${environment.venueSlug}]`);
  await page.waitForSelector("[data-testid=console]");
  await page.waitForSelector("[data-testid=realtime-chip][data-state=open]");
}

export async function openConsole(
  browser: Browser,
  environment: E2eEnvironment,
  namespace: string,
  options: { width?: number; height?: number } = {},
): Promise<OpenedApp> {
  const opened = await openApp(browser, environment, namespace, options);
  await signIn(opened.page, environment);
  await enterConsole(opened.page, environment);
  return opened;
}
