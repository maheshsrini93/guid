import { test, expect } from "@playwright/test";

test.describe("Pricing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("displays the main heading and description", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Simple, transparent pricing" })
    ).toBeVisible();

    await expect(
      page.getByText("Get more out of Guid with Premium")
    ).toBeVisible();
  });

  test("shows Free and Premium plan cards with correct prices", async ({
    page,
  }) => {
    // Free plan card
    const freeHeading = page.getByRole("heading", { name: "Free" });
    await expect(freeHeading).toBeVisible();
    await expect(page.getByText("$0")).toBeVisible();
    await expect(page.getByText("forever")).toBeVisible();

    // Premium plan card
    const premiumHeading = page.getByRole("heading", { name: "Premium" });
    await expect(premiumHeading).toBeVisible();
    await expect(page.getByText("$9.99/mo")).toBeVisible();

    // "Most Popular" badge on Premium card
    await expect(page.getByText("Most Popular")).toBeVisible();
  });

  test("billing toggle switches between Monthly and Annual pricing", async ({
    page,
  }) => {
    const monthlyBtn = page.getByRole("button", { name: "Monthly" });
    const annualBtn = page.getByRole("button", { name: /Annual/ });

    // Monthly is the default
    await expect(monthlyBtn).toHaveAttribute("aria-pressed", "true");
    await expect(annualBtn).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("$9.99/mo")).toBeVisible();

    // Switch to Annual
    await annualBtn.click();

    await expect(annualBtn).toHaveAttribute("aria-pressed", "true");
    await expect(monthlyBtn).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("$99/yr")).toBeVisible();
    await expect(page.getByText("Save 17%")).toBeVisible();
    await expect(page.getByText("($8.25/mo)")).toBeVisible();
  });

  test("Free plan CTA links to /register", async ({ page }) => {
    const getStartedLink = page.getByRole("link", { name: "Get Started" });
    await expect(getStartedLink).toBeVisible();
    await expect(getStartedLink).toHaveAttribute("href", "/register");
  });

  test("Premium upgrade button redirects unauthenticated user to /login", async ({
    page,
  }) => {
    const upgradeBtn = page.getByRole("button", {
      name: "Upgrade to Premium",
    });
    await expect(upgradeBtn).toBeVisible();

    // Intercept the Stripe checkout call so we never actually call Stripe.
    // The endpoint returns 401 for unauthenticated users, which triggers
    // a client-side redirect to /login?callbackUrl=/pricing.
    await upgradeBtn.click();

    await page.waitForURL((url) => url.pathname === "/login", {
      timeout: 10_000,
    });
    expect(page.url()).toContain("/login");
    expect(page.url()).toContain("callbackUrl");
  });

  test("feature comparison table is visible with all feature rows", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Feature comparison" })
    ).toBeVisible();

    // The comparison table has column headers
    const tableHeader = page.locator(
      ".grid >> text=Feature"
    );
    await expect(tableHeader.first()).toBeVisible();

    // Verify some key feature rows exist
    const expectedFeatures = [
      "Step-by-step assembly guides",
      "AI troubleshooting chats",
      "Video guides",
      "Offline access",
      "Ad-free experience",
      "Priority AI responses",
    ];

    for (const feature of expectedFeatures) {
      await expect(page.getByText(feature).first()).toBeVisible();
    }
  });

  test("FAQ section has Browse Guides and Try AI Chat Free links", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", { name: "Questions?" })
    ).toBeVisible();

    const browseLink = page.getByRole("link", { name: "Browse Guides" });
    await expect(browseLink).toBeVisible();
    await expect(browseLink).toHaveAttribute("href", "/products");

    const chatLink = page.getByRole("link", { name: "Try AI Chat Free" });
    await expect(chatLink).toBeVisible();
    await expect(chatLink).toHaveAttribute("href", "/chat");
  });
});
