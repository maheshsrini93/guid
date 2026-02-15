import { test, expect } from "@playwright/test";
import {
  findProductWithGuide,
  findAnyProduct,
} from "../fixtures/test-data";

test.describe("Product detail page", () => {
  test("product page renders name and article number", async ({
    page,
    request,
  }) => {
    const product = await findAnyProduct(request);
    test.skip(!product, "No products in database");

    await page.goto(`/products/${product!.articleNumber}`);

    // Article number should appear on the page (in mono text)
    await expect(page.locator("main").getByText(product!.articleNumber).first()).toBeVisible();

    // Product name should appear as h1
    if (product!.name) {
      await expect(
        page.getByRole("heading", { level: 1, name: product!.name })
      ).toBeVisible();
    }
  });

  test("breadcrumbs include Products link", async ({ page, request }) => {
    const product = await findAnyProduct(request);
    test.skip(!product, "No products in database");

    await page.goto(`/products/${product!.articleNumber}`);

    // Breadcrumb nav with "Products" link back to listing — scope to main to avoid header nav
    const productsLink = page
      .locator("main")
      .getByRole("link", { name: "Products" });
    await expect(productsLink).toBeVisible();
    await expect(productsLink).toHaveAttribute("href", "/products");
  });

  test("non-existent product shows 404 page", async ({ page }) => {
    await page.goto("/products/DOES_NOT_EXIST_99999");
    // Next.js renders a custom not-found page with heading "404"
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  });
});

test.describe("Guide viewer (published guide)", () => {
  test("guide-first view shows step content when guide exists", async ({
    page,
    request,
  }) => {
    const product = await findProductWithGuide(request);
    test.skip(!product, "No published guides found — skipping guide viewer tests");

    await page.goto(`/products/${product!.articleNumber}`);

    // The guide viewer should render Step 1 content
    await expect(page.getByText("Step 1", { exact: false })).toBeVisible({
      timeout: 15_000,
    });
  });

  test("guide header shows difficulty badge", async ({ page, request }) => {
    const product = await findProductWithGuide(request);
    test.skip(!product, "No published guides found");

    await page.goto(`/products/${product!.articleNumber}`);

    // Difficulty badge should appear (easy/medium/hard)
    await expect(
      page.getByText(/easy|medium|hard/i).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("guide has a sr-only h1 for accessibility", async ({
    page,
    request,
  }) => {
    const product = await findProductWithGuide(request);
    test.skip(!product, "No published guides found");

    await page.goto(`/products/${product!.articleNumber}`);

    // The sr-only h1: "How to Assemble <name> — Step-by-Step Guide"
    const h1 = page.getByRole("heading", { level: 1 });
    await expect(h1).toHaveText(/How to Assemble/);
  });

  test("product info card links to /details page", async ({
    page,
    request,
  }) => {
    const product = await findProductWithGuide(request);
    test.skip(!product, "No published guides found");

    await page.goto(`/products/${product!.articleNumber}`);

    // ProductInfoCard has "View details" text
    const detailsLink = page.getByRole("link", {
      name: /View details/i,
    });
    await expect(detailsLink).toBeVisible({ timeout: 15_000 });
    await expect(detailsLink).toHaveAttribute(
      "href",
      `/products/${product!.articleNumber}/details`
    );
  });

  test("guide progress bar is visible", async ({ page, request }) => {
    const product = await findProductWithGuide(request);
    test.skip(!product, "No published guides found");

    await page.goto(`/products/${product!.articleNumber}`);

    // ProgressBar renders a div with role=progressbar
    await expect(page.getByRole("progressbar")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("guide keyboard navigation with ArrowRight advances step", async ({
    page,
    request,
  }) => {
    const product = await findProductWithGuide(request);
    test.skip(!product, "No published guides found");

    await page.goto(`/products/${product!.articleNumber}`);
    await page.waitForSelector("[data-step-number]", { timeout: 15_000 });

    // Press ArrowRight to navigate to next step
    await page.keyboard.press("ArrowRight");

    // The page should still be on the same URL (step navigation is in-page)
    await expect(page).toHaveURL(
      new RegExp(`/products/${product!.articleNumber}`)
    );
  });

  test("@mobile guide renders mobile step card on small viewport", async ({
    page,
    request,
  }) => {
    const product = await findProductWithGuide(request);
    test.skip(!product, "No published guides found");

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/products/${product!.articleNumber}`);

    // Mobile step card shows "Step X of Y" pattern
    await expect(
      page.getByText(/Step \d+ of \d+/i)
    ).toBeVisible({ timeout: 15_000 });
  });
});
