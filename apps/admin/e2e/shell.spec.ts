import { expect, test } from "@playwright/test";
import { signInWithToken } from "./support";

test.describe("shell", () => {
  test("command palette navigates by keyboard", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.keyboard.press("Control+k");
    const input = page.getByRole("combobox");
    await expect(input).toBeFocused();
    await input.fill("audit");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/audit$/);
    await expect(page.getByRole("heading", { name: "Audit log" })).toBeVisible();
  });

  test("g-then-letter chords jump between sections and ? lists them", async ({
    page,
    context,
    request,
  }) => {
    await signInWithToken(context, request);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.keyboard.press("g");
    await page.keyboard.press("q");
    await expect(page).toHaveURL(/\/qr$/);
    await page.keyboard.press("g");
    await page.keyboard.press("d");
    await expect(page).toHaveURL(/\/djs$/);
    await page.keyboard.press("?");
    await expect(page.getByRole("dialog", { name: "Keyboard shortcuts" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("language switch persists across reloads", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    await page.goto("/");
    await page.getByRole("button", { name: "Language" }).click();
    await page.getByRole("menuitemradio", { name: /Oʻzbekcha/ }).click();
    await expect(page.getByRole("heading", { name: "Umumiy koʻrinish" })).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("lang", "uz");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Umumiy koʻrinish" })).toBeVisible();
    await page.getByRole("button", { name: "Til" }).click();
    await page.getByRole("menuitemradio", { name: /Русский/ }).click();
    await expect(page.getByRole("heading", { name: "Обзор" })).toBeVisible();
  });

  test("billing is an honest stub and audit lists earlier actions", async ({
    page,
    context,
    request,
  }) => {
    await signInWithToken(context, request);
    await page.goto("/billing");
    await expect(page.getByText("Payments are not enabled yet")).toBeVisible();
    await expect(page.getByTestId("plan-pilot")).toBeVisible();
    await expect(page.getByRole("button", { name: "Coming soon" }).first()).toBeDisabled();
    await page.goto("/audit");
    await expect(page.getByTestId("audit-row").first()).toBeVisible();
    await page.getByRole("searchbox", { name: "Search" }).fill("nomad");
    await expect(page.getByTestId("audit-row").first()).toContainText(/Nomad/i);
  });

  test("the layout collapses to a rail on tablet widths", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/venues");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav).toBeVisible();
    const box = await nav.boundingBox();
    expect(box?.width ?? 999).toBeLessThan(80);
    await expect(page.getByRole("link", { name: "QR Studio" })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("branding previews all three themes and saves the choice", async ({
    page,
    context,
    request,
  }) => {
    await signInWithToken(context, request);
    await page.goto("/branding");
    await page
      .getByRole("combobox", { name: "Venue" })
      .first()
      .selectOption({ label: "Oasis Café" });
    await expect(page.getByTestId("theme-preview-club").first()).toBeVisible();
    await expect(page.getByTestId("theme-preview-lounge").first()).toBeVisible();
    await expect(page.getByTestId("theme-preview-cafe").first()).toBeVisible();
    await page.getByRole("radio").nth(1).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Branding saved")).toBeVisible();
    await page.getByRole("radio").nth(2).click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Branding saved").last()).toBeVisible();
  });
});
