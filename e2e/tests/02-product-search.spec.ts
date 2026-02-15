import { test, expect } from "@playwright/test";
import {
  findAnyProduct,
  searchAndWait,
} from "../fixtures/test-data";

test.describe("Product search and browsing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products");
  });

  test("products page displays heading and product count", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Products" })
    ).toBeVisible();
    // "X products" subtitle
    await expect(page.getByText(/\d[\d,]* products/)).toBeVisible();
  });

  test("product grid renders at least one product card", async ({ page }) => {
    // Product cards are links inside the grid
    const cards = page.locator("a[href^='/products/']").first();
    await expect(cards).toBeVisible();
  });

  test("text search returns results via autocomplete dropdown", async ({
    page,
  }) => {
    await searchAndWait(page, "KALLAX");

    // Autocomplete dropdown should appear with results
    const dropdown = page.locator("[role='combobox'] ~ div, .absolute.top-full");
    // At least one result button in the dropdown
    await expect(
      page.locator("button").filter({ hasText: /KALLAX/i }).first()
    ).toBeVisible({ timeout: 10_000 });
  });

  test("article number search shows exact match banner", async ({
    page,
    request,
  }) => {
    // Find a real product to get its article number
    const product = await findAnyProduct(request);
    test.skip(!product, "No products in database to test with");

    await searchAndWait(page, product!.articleNumber);

    // Should show "Exact article number match" banner
    await expect(
      page.getByText("Exact article number match")
    ).toBeVisible({ timeout: 10_000 });
  });

  test("clicking autocomplete result navigates to product page", async ({
    page,
    request,
  }) => {
    const product = await findAnyProduct(request);
    test.skip(!product, "No products in database to test with");

    await searchAndWait(page, product!.articleNumber);

    // Click on the first result in the dropdown
    const resultButton = page
      .locator("button")
      .filter({ hasText: new RegExp(product!.articleNumber) })
      .first();
    await expect(resultButton).toBeVisible({ timeout: 10_000 });
    await resultButton.click();

    await expect(page).toHaveURL(
      new RegExp(`/products/${product!.articleNumber}`)
    );
  });

  test("sort select changes product order", async ({ page }) => {
    // The sort select is hidden on mobile; ensure desktop width
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/products");

    // Click the sort trigger (it defaults to "Name (A-Z)")
    const sortTrigger = page.locator(".hidden.sm\\:block select, .hidden.sm\\:block button[role='combobox']").first();
    // Fallback: use the wider selector
    const trigger = page.getByRole("combobox").nth(1); // second combobox (first is search)
    await trigger.click();

    // Select "Price (Low to High)"
    await page.getByRole("option", { name: "Price (Low to High)" }).click();

    // URL should now contain sort=price_asc
    await expect(page).toHaveURL(/sort=price_asc/);
  });

  test("filter sidebar is visible on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/products");

    await expect(page.getByRole("heading", { name: "Filters" })).toBeVisible();
  });

  test("pagination controls appear when there are multiple pages", async ({
    page,
  }) => {
    // The products page has 24 items per page; with 12k+ products, pagination is expected
    await expect(page.getByText(/Page \d+ of \d+/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Next" })
    ).toBeVisible();
  });

  test("pagination Next navigates to page 2", async ({ page }) => {
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText(/Page 2 of/)).toBeVisible();

    // Previous button should now be visible
    await expect(
      page.getByRole("link", { name: "Previous" })
    ).toBeVisible();
  });

  test("no results state shows message for gibberish query", async ({
    page,
  }) => {
    // Navigate to products with a nonsense search query
    await page.goto("/products?q=zzzzxyzzy99999");

    await expect(page.getByText("No products found")).toBeVisible();
    await expect(
      page.getByText("Try adjusting your search or filters")
    ).toBeVisible();
  });

  test("@mobile filter sheet opens on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/products");

    // The mobile filter button should be visible
    const filterBtn = page.getByRole("button", { name: "Filters" });
    await expect(filterBtn).toBeVisible();

    // Click to open the sheet
    await filterBtn.click();

    // The sheet dialog should contain a filter heading
    await expect(
      page.getByRole("dialog").getByRole("heading", { name: "Filters" }).first()
    ).toBeVisible();
  });
});
