import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("displays hero heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: "Find step-by-step instructions for any product",
      })
    ).toBeVisible();
  });

  test("shows stats section with product count and free badge", async ({
    page,
  }) => {
    // "X products" stat — the count is dynamic but the word "products" is constant
    await expect(page.getByText(/\d[\d,]* products/)).toBeVisible();
    await expect(page.getByText("Free to use")).toBeVisible();
  });

  test("search input is visible on homepage", async ({ page }) => {
    await expect(
      page.getByRole("combobox", { name: "Search products" })
    ).toBeVisible();
  });

  test('"Browse Guides" CTA navigates to /products', async ({ page }) => {
    await page.getByRole("link", { name: "Browse Guides" }).click();
    await expect(page).toHaveURL(/\/products/);
    await expect(
      page.getByRole("heading", { name: "Products" })
    ).toBeVisible();
  });

  test('"Get Started" CTA navigates to /register', async ({ page }) => {
    await page.getByRole("link", { name: "Get Started" }).click();
    await expect(page).toHaveURL(/\/register/);
    await expect(
      page.getByRole("heading", { name: "Create an account" })
    ).toBeVisible();
  });

  test("header nav links are functional", async ({ page }) => {
    // "Guid" logo link leads to homepage
    const logo = page.getByRole("link", { name: "Guid" }).first();
    await expect(logo).toHaveAttribute("href", "/");

    // Products link
    await page.getByRole("link", { name: "Products" }).first().click();
    await expect(page).toHaveURL(/\/products/);
  });

  test("theme toggle button is present and toggleable", async ({ page }) => {
    // Initially the theme toggle should be visible (label depends on current theme)
    const toggle = page.getByRole("button", {
      name: /Switch to (dark|light) mode/,
    });
    await expect(toggle).toBeVisible();

    // Click it and confirm the aria-label switches
    const initialLabel = await toggle.getAttribute("aria-label");
    await toggle.click();

    // After clicking, the label should change (dark <-> light)
    await expect(toggle).not.toHaveAttribute("aria-label", initialLabel!);
  });

  test("@mobile responsive: hero heading and CTAs visible on small viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        name: "Find step-by-step instructions for any product",
      })
    ).toBeVisible();

    await expect(
      page.getByRole("link", { name: "Browse Guides" })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Get Started" })
    ).toBeVisible();
  });
});
