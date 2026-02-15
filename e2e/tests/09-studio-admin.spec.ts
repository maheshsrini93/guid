import { test, expect } from "../fixtures/auth";
import { test as baseTest, expect as baseExpect } from "@playwright/test";

test.describe("Studio admin panel", () => {
  test("dashboard loads with stats cards", async ({ adminPage }) => {
    await adminPage.goto("/studio");

    await expect(
      adminPage.getByRole("heading", { name: "Dashboard" })
    ).toBeVisible();

    // Verify stat cards are rendered
    const expectedStats = [
      "Total Products",
      "Assembly PDFs",
      "Product Images",
      "Assembly Guides",
      "Registered Users",
    ];

    for (const stat of expectedStats) {
      await expect(adminPage.getByText(stat)).toBeVisible();
    }
  });

  test("sidebar has all 12 navigation links", async ({ adminPage }) => {
    await adminPage.goto("/studio");

    // Scope to aside to avoid matching header nav links with same names
    const sidebar = adminPage.locator("aside");

    const expectedLinks = [
      { name: "Dashboard", href: "/studio" },
      { name: "Products", href: "/studio/products" },
      { name: "Guides", href: "/studio/guides" },
      { name: "Submissions", href: "/studio/submissions" },
      { name: "Videos", href: "/studio/videos" },
      { name: "AI Generate", href: "/studio/ai-generate" },
      { name: "AI Config", href: "/studio/ai-config" },
      { name: "Retailers", href: "/studio/retailers" },
      { name: "Matching", href: "/studio/matching" },
      { name: "Catalog Sync", href: "/studio/catalog-sync" },
      { name: "Search Analytics", href: "/studio/analytics/search" },
      { name: "Affiliate Analytics", href: "/studio/analytics/affiliate" },
    ];

    for (const link of expectedLinks) {
      const navLink = sidebar.getByRole("link", { name: link.name, exact: true });
      await expect(navLink).toBeVisible();
      await expect(navLink).toHaveAttribute("href", link.href);
    }
  });

  test("sidebar links navigate to correct pages", async ({ adminPage }) => {
    await adminPage.goto("/studio");

    const sidebar = adminPage.locator("aside");

    // Navigate to Products
    await sidebar.getByRole("link", { name: "Products", exact: true }).click();
    await adminPage.waitForURL("**/studio/products**");
    expect(adminPage.url()).toContain("/studio/products");

    // Navigate to Guides
    await sidebar.getByRole("link", { name: "Guides", exact: true }).click();
    await adminPage.waitForURL("**/studio/guides**");
    expect(adminPage.url()).toContain("/studio/guides");

    // Navigate back to Dashboard
    await sidebar.getByRole("link", { name: "Dashboard", exact: true }).click();
    await adminPage.waitForURL((url) =>
      url.pathname === "/studio" || url.pathname === "/studio/"
    );
  });

  test("admin email is displayed in sidebar", async ({ adminPage }) => {
    await adminPage.goto("/studio");

    await expect(
      adminPage.getByText("admin@ikea-guide.local")
    ).toBeVisible();
  });

  test("sign out button is present in sidebar", async ({ adminPage }) => {
    await adminPage.goto("/studio");

    // Scope to aside to avoid matching header "Sign out" button
    await expect(
      adminPage.locator("aside").getByRole("button", { name: "Sign out" })
    ).toBeVisible();
  });

  test("products page shows product content", async ({ adminPage }) => {
    await adminPage.goto("/studio/products");
    await adminPage.waitForLoadState("networkidle");

    // The main content area should have loaded with product data
    // Look for article numbers (8-digit format like 20416197) or product text
    const mainContent = adminPage.locator("main, [class*='flex-1']");
    await expect(mainContent.first()).toBeVisible();

    // Verify at least some text content loaded (product names, article numbers, etc.)
    const textContent = await mainContent.first().textContent();
    expect(textContent!.length).toBeGreaterThan(50);
  });

  test("guides page shows guides list with New Guide button", async ({
    adminPage,
  }) => {
    await adminPage.goto("/studio/guides");

    await expect(
      adminPage.getByRole("heading", { name: "Assembly Guides" })
    ).toBeVisible();

    await expect(
      adminPage.getByRole("link", { name: "New Guide" })
    ).toBeVisible();
  });
});

// Separate describe block for unauthenticated access — uses base test (no auth fixtures)
baseTest.describe("Studio access control", () => {
  baseTest(
    "non-admin user is redirected away from /studio",
    async ({ page }) => {
      // Visit /studio without any auth
      await page.goto("/studio");

      // The studio layout redirects non-admins:
      // - unauthenticated users → /login
      // - non-admin users → /
      await page.waitForURL(
        (url) => !url.pathname.startsWith("/studio"),
        { timeout: 10_000 }
      );

      // Should have been redirected to /login or /
      const currentPath = new URL(page.url()).pathname;
      expect(currentPath === "/login" || currentPath === "/").toBeTruthy();
    }
  );
});
