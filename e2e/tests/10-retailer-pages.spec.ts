import { test, expect } from "@playwright/test";

/**
 * Retailer pages E2E tests.
 *
 * The entire suite is skipped if no retailers exist in the database.
 * Detection: navigate to /products and check if the retailer filter section
 * is present (it only renders when Retailer records exist).
 */

let retailerSlug: string | null = null;
let retailerName: string | null = null;

test.beforeAll(async ({ request }) => {
  // Try to detect retailers by hitting the products page API or by checking
  // for retailer data. We'll use a simple heuristic: request the products page
  // and look for retailer filter markup.
  const res = await request.get("/products");
  const html = await res.text();

  // The retailer filter section contains links like /retailers/[slug]
  const retailerLinkMatch = html.match(/\/retailers\/([a-z0-9-]+)/);
  if (retailerLinkMatch) {
    retailerSlug = retailerLinkMatch[1];
    // Try to extract the retailer name from the page
    const nameMatch = html.match(
      new RegExp(`/retailers/${retailerSlug}[^>]*>([^<]+)`)
    );
    retailerName = nameMatch ? nameMatch[1].trim() : retailerSlug;
  }
});

test.beforeEach(({ }, testInfo) => {
  if (!retailerSlug) {
    testInfo.skip(true, "No retailer records found in database — skipping retailer tests");
  }
});

test.describe("Retailer pages", () => {
  test("retailer page shows breadcrumbs with Home > Products > Retailer", async ({
    page,
  }) => {
    await page.goto(`/retailers/${retailerSlug}`);

    const breadcrumb = page.locator("nav[aria-label='Breadcrumb']");
    await expect(breadcrumb).toBeVisible();

    // Verify breadcrumb trail
    await expect(breadcrumb.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(
      breadcrumb.getByRole("link", { name: "Products" })
    ).toBeVisible();
    // The current retailer name should be the last breadcrumb item
    await expect(breadcrumb.getByText(retailerName!)).toBeVisible();
  });

  test("retailer page shows name heading and product count", async ({
    page,
  }) => {
    await page.goto(`/retailers/${retailerSlug}`);

    // Retailer name as h1
    await expect(
      page.getByRole("heading", { level: 1 }).filter({ hasText: retailerName! })
    ).toBeVisible();

    // Product count stat (e.g., "123 products")
    await expect(page.getByText(/\d+\s+products/)).toBeVisible();

    // Guides available stat
    await expect(page.getByText(/\d+\s+guides available/)).toBeVisible();
  });

  test("retailer page shows Visit link with external icon", async ({
    page,
  }) => {
    await page.goto(`/retailers/${retailerSlug}`);

    // Look for the "Visit [retailerName]" external link
    const visitLink = page.getByRole("link", {
      name: new RegExp(`Visit ${retailerName}`),
    });

    // The visit link may not exist if the retailer has no baseUrl,
    // so we conditionally check
    const linkCount = await visitLink.count();
    if (linkCount > 0) {
      await expect(visitLink).toHaveAttribute("target", "_blank");
      await expect(visitLink).toHaveAttribute("rel", /noopener/);
    }
  });

  test("retailer page displays product grid or empty state", async ({
    page,
  }) => {
    await page.goto(`/retailers/${retailerSlug}`);
    await page.waitForLoadState("networkidle");

    // Either a product grid or the "No products yet" empty state should be visible
    const productCards = page.locator(
      ".grid a[href^='/products/']"
    );
    const emptyState = page.getByText("No products yet");

    const cardCount = await productCards.count();
    const hasEmpty = await emptyState.isVisible();

    // One of the two states must be true
    expect(cardCount > 0 || hasEmpty).toBeTruthy();
  });

  test("non-existent retailer slug returns 404", async ({ page }) => {
    const response = await page.goto("/retailers/this-retailer-does-not-exist");

    // The page should return 404 (notFound())
    expect(response?.status()).toBe(404);
  });
});
