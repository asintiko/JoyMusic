import type { BrowserContext } from "playwright-core";

export async function seedSettings(
  context: BrowserContext,
  namespace: string,
  patch: Record<string, unknown>,
): Promise<void> {
  await context.addInitScript(
    ([key, value]) => {
      if (!window.localStorage.getItem(key as string)) {
        window.localStorage.setItem(key as string, value as string);
      }
    },
    [`joy.shim.${namespace}.settings.json`, JSON.stringify(patch)],
  );
}
