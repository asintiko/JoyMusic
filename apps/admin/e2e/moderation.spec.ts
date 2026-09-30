import { expect, test } from "@playwright/test";
import { signInWithToken, unique } from "./support";

test.describe("moderation", () => {
  test("adds and removes a banned word with persistence", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    const word = `zz${unique("w").slice(-6)}`;
    await page.goto("/moderation");
    await expect(page.getByRole("heading", { name: "Moderation" })).toBeVisible();
    await expect(page.getByTestId("banned-word").first()).toBeVisible();

    await page.getByLabel("Add a banned word").fill(word.toUpperCase());
    await page.getByRole("button", { name: "Add", exact: true }).click();
    const chip = page.getByTestId("banned-word").filter({ hasText: word });
    await expect(chip).toBeVisible();
    await page.reload();
    await expect(page.getByTestId("banned-word").filter({ hasText: word })).toBeVisible();

    await page.getByRole("button", { name: `Remove ${word}` }).click();
    await expect(page.getByTestId("banned-word").filter({ hasText: word })).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId("banned-word").filter({ hasText: word })).toHaveCount(0);
  });

  test("blocks duplicates client-side", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    await page.goto("/moderation");
    const first = await page.getByTestId("banned-word").first().innerText();
    await page.getByLabel("Add a banned word").fill(first.trim());
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("This word is already in the list")).toBeVisible();
  });

  test("device ban needs an id and a confirmation", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    await page.goto("/moderation");
    const ban = page.getByRole("button", { name: "Ban device" });
    await expect(ban).toBeDisabled();
    await page.getByLabel("Device ID").fill("d-e2e-device-0001");
    await ban.click();
    await page.getByRole("dialog").getByRole("button", { name: "Ban device" }).click();
    await expect(page.getByText(/Device banned at/)).toBeVisible();
  });
});
