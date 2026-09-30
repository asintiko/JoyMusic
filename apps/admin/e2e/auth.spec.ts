import { expect, test } from "@playwright/test";
import { djEmail, ownerEmail, seedPassword, signInWithToken, uiLogin, unique } from "./support";

test.describe("authentication", () => {
  test("owner signs in, sees the overview and signs out", async ({ page }) => {
    await uiLogin(page, ownerEmail);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Account menu" }).first().click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto("/venues");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fvenues/);
  });

  test("wrong password shows a friendly error and no session", async ({ page }) => {
    await uiLogin(page, ownerEmail, "definitely-wrong");
    await expect(page.getByRole("alert")).toContainText("Wrong email or password.");
    await expect(page).toHaveURL(/\/login/);
  });

  test("returns to the requested page after signing in", async ({ page }) => {
    await page.goto("/analytics");
    await expect(page).toHaveURL(/\/login\?redirect=%2Fanalytics/);
    await page.getByLabel("Email", { exact: true }).fill(ownerEmail);
    await page.getByLabel("Password", { exact: true }).fill(seedPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/analytics$/);
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
  });

  test("the session survives a reload through the refresh token", async ({ page }) => {
    await uiLogin(page, ownerEmail);
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();
  });

  test("registration creates an organization and lands on an empty workspace", async ({ page }) => {
    const email = `${unique("owner")}@example.com`;
    await page.goto("/register");
    await page.getByLabel(/Organization name/).fill("Fresh Cafe Group");
    await page.getByLabel("Your name").fill("Malika Yusupova");
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill("a-strong-password-1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Create your first venue")).toBeVisible();
    await expect(page.getByRole("button", { name: "Account menu" }).first()).toBeVisible();
  });

  test("the Google button is hidden without a client id", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("google-button")).toHaveCount(0);
  });
});

test.describe("role gating", () => {
  test("a DJ is sent to the desktop-app page and cannot reach admin routes", async ({
    page,
    context,
    request,
  }) => {
    await signInWithToken(context, request, djEmail);
    await page.goto("/venues");
    await expect(page).toHaveURL(/\/dj$/);
    await expect(page.getByRole("heading", { name: /use the desktop app/i })).toBeVisible();
    await page.goto("/audit");
    await expect(page).toHaveURL(/\/dj$/);
    await expect(page.getByRole("navigation", { name: "Main navigation" })).toHaveCount(0);
  });
});

test.describe("desktop authorization", () => {
  const state = "e2e-state-123456";
  const challenge = "A".repeat(43);

  test("signed-in user confirms and the API issues a code", async ({ page, context, request }) => {
    await signInWithToken(context, request, djEmail);
    await page.goto(`/desktop/authorize?state=${state}&challenge=${challenge}`);
    await expect(page.getByRole("heading", { name: "Authorize Joy Music Desktop" })).toBeVisible();
    const responsePromise = page.waitForResponse((response) =>
      response.url().endsWith("/v1/auth/desktop/authorize"),
    );
    await page.getByRole("button", { name: "Authorize Joy Music Desktop" }).click();
    const response = await responsePromise;
    expect(response.status()).toBe(200);
    const payload = (await response.json()) as { code: string; state: string };
    expect(payload.state).toBe(state);
    await expect(page.getByText("Return to the app")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open the app again" })).toHaveAttribute(
      "href",
      `joymusic://auth?code=${payload.code}&state=${state}`,
    );
  });

  test("anonymous visitors sign in first and come back to the confirmation", async ({ page }) => {
    await page.goto(`/desktop/authorize?state=${state}&challenge=${challenge}`);
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await page.getByLabel("Email", { exact: true }).fill(djEmail);
    await page.getByLabel("Password", { exact: true }).fill(seedPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: "Authorize Joy Music Desktop" })).toBeVisible();
  });

  test("an incomplete link is explained", async ({ page, context, request }) => {
    await signInWithToken(context, request, djEmail);
    await page.goto("/desktop/authorize?state=abc");
    await expect(page.getByText("This link is incomplete")).toBeVisible();
  });
});
