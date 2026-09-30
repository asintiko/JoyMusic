import { expect, test } from "@playwright/test";
import { signInWithToken, unique } from "./support";

test.describe("venues", () => {
  test("creates a venue with the wizard and edits its settings", async ({
    page,
    context,
    request,
  }) => {
    await signInWithToken(context, request);
    const name = `E2E Lounge ${unique("v").slice(-5)}`;
    await page.goto("/venues");
    await expect(page.getByRole("heading", { name: "Venues" })).toBeVisible();
    await page.getByRole("button", { name: "New venue" }).click();
    await expect(page).toHaveURL(/\/venues\/new/);

    await page.getByLabel(/Venue name/).fill(name);
    await expect(page.getByText("Address is available")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();

    await page.getByRole("radio").nth(1).click();
    await expect(page.getByRole("radio").nth(1)).toHaveAttribute("aria-checked", "true");
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Ready to create")).toBeVisible();
    await page.getByRole("button", { name: "Create venue" }).click();

    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page).toHaveURL(/\/venues\/ven_/);
    await expect(page.getByTestId("theme-preview-lounge").first()).toBeVisible();

    await page.getByLabel("Requests per guest").fill("7");
    await page.getByLabel("Limit window").fill("45");
    await expect(page.getByRole("region", { name: "You have unsaved changes" })).toBeVisible();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Venue saved")).toBeVisible();

    const toggle = page.getByRole("switch", { name: /Accepting requests/ });
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await toggle.click();
    await expect(page.getByText("Requests are closed")).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-checked", "false");

    await page.reload();
    await expect(page.getByLabel("Requests per guest")).toHaveValue("7");
    await expect(page.getByLabel("Limit window")).toHaveValue("45");
    await expect(page.getByRole("switch", { name: /Accepting requests/ })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  test("slug conflicts are reported before and after submitting", async ({
    page,
    context,
    request,
  }) => {
    await signInWithToken(context, request);
    await page.goto("/venues/new");
    await page.getByLabel(/Venue name/).fill("Joy Demo Club");
    await expect(page.getByText("Address is already taken")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
    await expect(page.getByText("Choose the guest look")).toHaveCount(0);
  });

  test("venue list filters by name", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    await page.goto("/venues");
    await expect(page.getByRole("link", { name: /Joy Demo Club/ })).toBeVisible();
    await page.getByRole("searchbox", { name: "Search" }).fill("nomad");
    await expect(page.getByRole("link", { name: /Nomad Lounge/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Joy Demo Club/ })).toHaveCount(0);
  });

  test("deleting a venue needs the slug typed", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    const name = `Delete Me ${unique("d").slice(-5)}`;
    await page.goto("/venues/new");
    await page.getByLabel(/Venue name/).fill(name);
    await expect(page.getByText("Address is available")).toBeVisible();
    const slug = await page.getByLabel(/Web address/).inputValue();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByRole("button", { name: "Create venue" }).click();
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await page.getByRole("button", { name: "Delete venue" }).first().click();
    const dialog = page.getByRole("dialog");
    const confirm = dialog.getByRole("button", { name: "Delete venue" });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(/Type .* to confirm/).fill(slug);
    await confirm.click();
    await expect(page).toHaveURL(/\/venues$/);
    await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
  });
});
