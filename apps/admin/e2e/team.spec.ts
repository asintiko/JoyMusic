import { expect, test } from "@playwright/test";
import { ownerEmail, signInWithToken, unique } from "./support";

test.describe("DJs and roles", () => {
  test("invites a DJ, the DJ accepts the link and is gated to the desktop page", async ({
    page,
    context,
    request,
    browser,
  }) => {
    await signInWithToken(context, request);
    const email = `${unique("dj")}@example.com`;
    await page.goto("/djs");
    await expect(page.getByRole("heading", { name: "DJs" })).toBeVisible();
    await page.getByRole("button", { name: "Invite" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email", { exact: true }).fill(email);
    await dialog.getByRole("button", { name: "Create invite" }).click();
    const link = dialog.getByRole("textbox", { name: "Invitation link" });
    await expect(link).toHaveValue(/\/invite\/.+/);
    const inviteUrl = await link.inputValue();
    expect(inviteUrl.startsWith("http://localhost:5184/invite/")).toBe(true);
    await dialog.getByRole("button", { name: "Done" }).click();
    await expect(page.getByTestId("member-row").filter({ hasText: email })).toBeVisible();

    const guest = await browser.newContext({
      storageState: {
        cookies: [],
        origins: [
          {
            origin: "http://localhost:5184",
            localStorage: [{ name: "joymusic.admin.locale", value: "en" }],
          },
        ],
      },
    });
    const guestPage = await guest.newPage();
    await guestPage.goto(inviteUrl);
    await guestPage.getByLabel("Your name").fill("New Rustam");
    await guestPage.getByLabel("Password", { exact: true }).fill("dj-password-123");
    await guestPage.getByRole("button", { name: "Accept invitation" }).click();
    await expect(guestPage).toHaveURL(/\/dj$/);
    await expect(guestPage.getByRole("heading", { name: /New Rustam/ })).toBeVisible();
    await guest.close();

    await page.reload();
    const row = page.getByTestId("member-row").filter({ hasText: email });
    await expect(row.getByText("Active")).toBeVisible();
    await expect(row.getByText("New Rustam")).toBeVisible();
  });

  test("changes a role and removes a member", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    const email = `${unique("mem")}@example.com`;
    await page.goto("/djs");
    await page.getByRole("button", { name: "Invite" }).click();
    await page.getByRole("dialog").getByLabel("Email", { exact: true }).fill(email);
    await page.getByRole("dialog").getByRole("button", { name: "Create invite" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Done" }).click();

    const row = page.getByTestId("member-row").filter({ hasText: email });
    await row.getByRole("combobox").selectOption("admin");
    await expect(page.getByText(/is now Admin/)).toBeVisible();
    await page.reload();
    await expect(
      page.getByTestId("member-row").filter({ hasText: email }).getByRole("combobox"),
    ).toHaveValue("admin");

    await page
      .getByTestId("member-row")
      .filter({ hasText: email })
      .getByRole("button", { name: "Actions" })
      .click();
    await page.getByRole("menuitem", { name: "Revoke invite" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Revoke invite" }).click();
    await expect(page.getByText("Invitation revoked")).toBeVisible();
    await expect(page.getByText(email)).toHaveCount(0);
  });

  test("protects the last owner", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    await page.goto("/djs");
    const ownerRow = page.getByTestId("member-row").filter({ hasText: ownerEmail });
    await expect(ownerRow.getByText("you")).toBeVisible();
    await expect(ownerRow.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByText(/There is one owner/)).toBeVisible();
    await ownerRow.getByRole("button", { name: "Actions" }).click();
    await expect(page.getByRole("menuitem", { name: "Remove from organization" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });
});
