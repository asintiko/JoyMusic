import { expect } from "vitest";
import type { Locator } from "playwright-core";

const defaultTimeout = 8000;

export async function expectVisible(locator: Locator, timeout = defaultTimeout): Promise<void> {
  await locator.first().waitFor({ state: "visible", timeout });
}

export async function expectGone(locator: Locator, timeout = defaultTimeout): Promise<void> {
  await expect.poll(() => locator.count(), { timeout }).toBe(0);
}

export async function expectCount(locator: Locator, count: number, timeout = defaultTimeout) {
  await expect.poll(() => locator.count(), { timeout }).toBe(count);
}

export async function expectContains(locator: Locator, text: string, timeout = defaultTimeout) {
  await expect
    .poll(async () => ((await locator.count()) > 0 ? await locator.first().innerText() : ""), {
      timeout,
    })
    .toContain(text);
}

export async function expectExactText(locator: Locator, text: string, timeout = defaultTimeout) {
  await expect
    .poll(
      async () => ((await locator.count()) > 0 ? (await locator.first().innerText()).trim() : ""),
      {
        timeout,
      },
    )
    .toBe(text);
}

export async function expectAttribute(
  locator: Locator,
  name: string,
  value: string,
  timeout = defaultTimeout,
) {
  await expect
    .poll(
      async () => ((await locator.count()) > 0 ? await locator.first().getAttribute(name) : null),
      {
        timeout,
      },
    )
    .toBe(value);
}
