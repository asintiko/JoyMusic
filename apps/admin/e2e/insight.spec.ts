import { expect, test } from "@playwright/test";
import { createVenueViaApi, signInWithToken, unique } from "./support";

test.describe("overview and analytics", () => {
  test("analytics renders KPIs and every chart from real data", async ({
    page,
    context,
    request,
  }) => {
    await signInWithToken(context, request);
    await page.goto("/analytics");
    await expect(page.getByRole("heading", { name: "Analytics" })).toBeVisible();
    await expect(page.getByText("Requests over time")).toBeVisible();
    await expect(page.locator("svg[role=group]").first()).toBeVisible();
    await expect(page.getByRole("group", { name: "Requests by hour" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Most requested" })).toBeVisible();
    await expect(page.getByRole("meter", { name: "Decline rate" })).toBeVisible();
    const requests = page.locator("p", { hasText: /^[\d,]+$/ }).nth(1);
    await expect(requests).toBeVisible();
    await expect(page.getByText("Peak").first()).toBeVisible();
  });

  test("filters by venue and range, and offers a table view", async ({
    page,
    context,
    request,
  }) => {
    await signInWithToken(context, request);
    await page.goto("/analytics");
    await expect(page.getByRole("list", { name: "Most requested" })).toBeVisible();
    await page
      .getByRole("combobox", { name: "Venue" })
      .first()
      .selectOption({ label: "Nomad Lounge" });
    await page.getByRole("tab", { name: "7 days" }).click();
    await expect(page.getByText("7 days").last()).toBeVisible();
    await page.getByRole("button", { name: "Show as table" }).first().click();
    await expect(page.getByRole("table", { name: "Requests over time" })).toBeVisible();
    await page.getByRole("button", { name: "Custom range" }).click();
    await expect(page.getByLabel("From")).toBeVisible();
  });

  test("a venue without activity shows an honest empty state", async ({
    page,
    context,
    request,
  }) => {
    const suffix = unique("empty").slice(-5);
    const venue = await createVenueViaApi(request, `Quiet ${suffix}`, `quiet-${suffix}`);
    await signInWithToken(context, request);
    await page.goto("/analytics");
    await page.getByRole("combobox", { name: "Venue" }).first().selectOption(venue.id);
    await expect(page.getByText("No requests in this period")).toBeVisible();
  });

  test("overview shows KPIs, the hourly chart, top tracks and live sessions", async ({
    page,
    context,
    request,
  }) => {
    await signInWithToken(context, request);
    await page.goto("/");
    await expect(page.getByText("Requests by hour")).toBeVisible();
    await expect(page.getByRole("group", { name: "Requests by hour" })).toBeVisible();
    await expect(page.getByText("Most requested")).toBeVisible();
    await expect(page.getByText("Live sessions")).toBeVisible();
    await expect(page.getByText("Quick actions")).toBeVisible();
    await expect(page.getByRole("table", { name: "Venues" })).toBeVisible();
    await page.getByRole("tab", { name: "30 days" }).click();
    await expect(page.getByText(/^Last 30 days ·/)).toBeVisible();
  });

  test("the bar chart shows a tooltip on hover", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    await page.goto("/");
    const bars = page.getByRole("group", { name: "Requests by hour" }).getByRole("img");
    await expect(bars).toHaveCount(24);
    await bars.nth(22).hover();
    await expect(page.getByText("22:00").first()).toBeVisible();
  });
});
