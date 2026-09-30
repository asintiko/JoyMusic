import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { createVenueViaApi, signInWithToken, unique } from "./support";

test.describe("QR studio", () => {
  test("creates a code, renders the preview and downloads SVG, PNG and PDF", async ({
    page,
    context,
    request,
  }) => {
    const suffix = unique("qr").slice(-5);
    const slug = `qr-${suffix}`;
    const venue = await createVenueViaApi(request, `QR Venue ${suffix}`, slug);
    await signInWithToken(context, request);
    await page.goto("/qr");
    await page.getByRole("combobox", { name: "Venue" }).first().selectOption(venue.id);
    await expect(page.getByText("No codes yet")).toBeVisible();

    await page.getByRole("button", { name: "New code" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Label").fill("Table 1");
    await dialog.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText("Code Table 1 created")).toBeVisible();
    await expect(page.getByTestId("qr-row")).toHaveCount(1);

    const preview = page.getByTestId("qr-preview");
    await expect(preview).toBeVisible();
    await expect
      .poll(async () =>
        preview.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0),
      )
      .toBe(true);
    expect(await preview.getAttribute("src")).toContain("data:image/svg+xml");

    const svgDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "SVG", exact: true }).click();
    const svg = await svgDownload;
    expect(svg.suggestedFilename()).toBe(`${slug}-table-1-table-tent.svg`);
    const svgPath = await svg.path();
    expect((await readFile(svgPath)).toString("utf8").startsWith("<svg")).toBe(true);

    const pngDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "PNG", exact: true }).click();
    const png = await pngDownload;
    expect(png.suggestedFilename()).toBe(`${slug}-table-1-table-tent.png`);
    const pngBytes = await readFile(await png.path());
    expect([...pngBytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);

    const pdfDownload = page.waitForEvent("download");
    await page.getByRole("button", { name: "PDF", exact: true }).click();
    const pdf = await pdfDownload;
    expect(pdf.suggestedFilename()).toBe(`${slug}-table-1-table-tent.pdf`);
    const pdfBytes = await readFile(await pdf.path());
    expect(pdfBytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdfBytes.length).toBeGreaterThan(5000);
  });

  test("switches templates and exports every table into one PDF", async ({
    page,
    context,
    request,
  }) => {
    const suffix = unique("batch").slice(-5);
    const venue = await createVenueViaApi(request, `Batch Venue ${suffix}`, `batch-${suffix}`);
    await signInWithToken(context, request);
    await page.goto("/qr");
    await page.getByRole("combobox", { name: "Venue" }).first().selectOption(venue.id);

    await page.getByRole("button", { name: "New code" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "Several tables" }).click();
    await dialog.getByLabel("How many").fill("3");
    await dialog.getByRole("button", { name: "Create 3" }).click();
    await expect(page.getByText("3 codes created")).toBeVisible();
    await expect(page.getByTestId("qr-row")).toHaveCount(3);

    const preview = page.getByTestId("qr-preview");
    const before = await preview.getAttribute("src");
    await page.getByRole("button", { name: "Poster" }).click();
    await expect.poll(async () => preview.getAttribute("src")).not.toBe(before);
    await page.getByRole("button", { name: "Sticker" }).click();

    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: /All tables, one PDF \(3\)/ }).click();
    const file = await download;
    expect(file.suggestedFilename()).toBe(`batch-${suffix}-all-tables-sticker.pdf`);
    const bytes = await readFile(await file.path());
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(3);
  });

  test("renames, disables and deletes codes", async ({ page, context, request }) => {
    const suffix = unique("mng").slice(-5);
    const venue = await createVenueViaApi(request, `Manage Venue ${suffix}`, `manage-${suffix}`);
    await signInWithToken(context, request);
    await page.goto("/qr");
    await page.getByRole("combobox", { name: "Venue" }).first().selectOption(venue.id);
    await page.getByRole("button", { name: "New code" }).first().click();
    await page.getByRole("dialog").getByLabel("Label").fill("Bar");
    await page.getByRole("dialog").getByRole("button", { name: "Create" }).click();
    await expect(page.getByTestId("qr-row")).toHaveCount(1);

    await page.getByRole("button", { name: "Actions" }).click();
    await page.getByRole("menuitem", { name: "Rename" }).click();
    await page.getByRole("dialog").getByLabel("Label").fill("VIP Bar");
    await page.getByRole("dialog").getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByTestId("qr-row").getByText("VIP Bar")).toBeVisible();

    const toggle = page.getByTestId("qr-row").getByRole("switch");
    await toggle.click();
    await expect(page.getByText("VIP Bar disabled")).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await page.reload();
    await expect(page.getByTestId("qr-row").getByRole("switch")).toHaveAttribute(
      "aria-checked",
      "false",
    );

    await page.getByRole("button", { name: "Actions" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText("No codes yet")).toBeVisible();
  });

  test("reads the scan counts the API returns", async ({ page, context, request }) => {
    await signInWithToken(context, request);
    await page.goto("/qr");
    await expect(page.getByTestId("qr-row").first()).toBeVisible();
    await expect(page.getByText("Total scans")).toBeVisible();
    const rows = await page.getByTestId("qr-row").count();
    expect(rows).toBeGreaterThanOrEqual(10);
  });
});
