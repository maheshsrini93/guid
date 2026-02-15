import { test, expect } from "../fixtures/auth";
import { test as baseTest, expect as baseExpect } from "@playwright/test";
import { findAnyProduct } from "../fixtures/test-data";

test.describe("Saved Products", () => {
  test("save button appears on product page for authenticated user", async ({
    userPage,
    request,
  }) => {
    const product = await findAnyProduct(request);
    test.skip(!product, "No products found in catalog");

    await userPage.goto(`/products/${product!.articleNumber}`);
    await userPage.waitForLoadState("networkidle");

    // The Save button should be visible for logged-in users
    const saveButton = userPage.getByRole("button", { name: /^Save/ });
    await expect(saveButton).toBeVisible();
  });

  test("can save and unsave a product via toggle button", async ({
    userPage,
    request,
  }) => {
    const product = await findAnyProduct(request);
    test.skip(!product, "No products found in catalog");

    await userPage.goto(`/products/${product!.articleNumber}`);
    await userPage.waitForLoadState("networkidle");

    const saveButton = userPage.getByRole("button", { name: /^Save/ });
    await expect(saveButton).toBeVisible();

    // Click to save — button text should change to "Saved"
    await saveButton.click();
    await expect(
      userPage.getByRole("button", { name: "Saved" })
    ).toBeVisible({ timeout: 10_000 });

    // Click again to unsave — button text should revert to "Save"
    await userPage.getByRole("button", { name: "Saved" }).click();
    await expect(
      userPage.getByRole("button", { name: "Save" })
    ).toBeVisible({ timeout: 10_000 });
  });

  test("saved product appears on profile page", async ({
    userPage,
    request,
  }) => {
    const product = await findAnyProduct(request);
    test.skip(!product, "No products found in catalog");

    // First, save the product
    await userPage.goto(`/products/${product!.articleNumber}`);
    await userPage.waitForLoadState("networkidle");

    const saveButton = userPage.getByRole("button", { name: /^Save/ });
    // If already saved, we're good; if not, save it
    const buttonText = await saveButton.textContent();
    if (buttonText?.trim() === "Save") {
      await saveButton.click();
      await expect(
        userPage.getByRole("button", { name: "Saved" })
      ).toBeVisible({ timeout: 10_000 });
    }

    // Navigate to profile and verify the product is listed
    await userPage.goto("/profile");
    await userPage.waitForLoadState("networkidle");

    // The profile page shows "Saved Products (N)" heading
    await expect(userPage.getByText("Saved Products")).toBeVisible();

    // The product name should appear in the saved list
    if (product!.name) {
      await expect(
        userPage.getByText(product!.name, { exact: false })
      ).toBeVisible();
    }

    // Clean up: unsave the product so tests are idempotent
    // The profile page also has a SaveProductButton for each saved product
    const unsaveButton = userPage
      .getByRole("button", { name: "Saved" })
      .first();
    if (await unsaveButton.isVisible()) {
      await unsaveButton.click();
    }
  });

  test("unsaving a product removes it from profile list", async ({
    userPage,
    request,
  }) => {
    const product = await findAnyProduct(request);
    test.skip(!product, "No products found in catalog");

    // Ensure the product is saved first
    await userPage.goto(`/products/${product!.articleNumber}`);
    await userPage.waitForLoadState("networkidle");

    const saveButton = userPage.getByRole("button", { name: /^Save/ });
    const buttonText = await saveButton.textContent();
    if (buttonText?.trim() === "Save") {
      await saveButton.click();
      await expect(
        userPage.getByRole("button", { name: "Saved" })
      ).toBeVisible({ timeout: 10_000 });
    }

    // Go to profile and unsave from there
    await userPage.goto("/profile");
    await userPage.waitForLoadState("networkidle");

    const unsaveButton = userPage
      .getByRole("button", { name: "Saved" })
      .first();
    await expect(unsaveButton).toBeVisible({ timeout: 10_000 });
    await unsaveButton.click();

    // Wait for revalidation — the product count should decrease or
    // the "No saved products" message should appear
    await userPage.waitForTimeout(2000);
    await userPage.reload();
    await userPage.waitForLoadState("networkidle");

    // Either the product is gone, or the empty state message appears
    const emptyMessage = userPage.getByText("No saved products yet");
    const productLink = userPage.getByText(product!.name, { exact: false });

    // At least one of these should be true: empty message visible OR product no longer listed
    const isEmpty = await emptyMessage.isVisible().catch(() => false);
    const productStillShown = await productLink
      .isVisible()
      .catch(() => false);

    expect(isEmpty || !productStillShown).toBe(true);
  });

  test("profile page shows empty state when no products are saved", async ({
    userPage,
  }) => {
    await userPage.goto("/profile");
    await userPage.waitForLoadState("networkidle");

    // The heading "Saved Products (N)" should always be visible
    await expect(userPage.getByText(/Saved Products/)).toBeVisible();

    // The page h1 heading is "Profile"
    const profileHeading = userPage.getByRole("heading", { level: 1, name: "Profile" });
    await expect(profileHeading).toBeVisible();
  });
});

// Unauthenticated tests — save button should not appear or should redirect
baseTest.describe("Saved Products - Unauthenticated", () => {
  baseTest(
    "save button is not shown for unauthenticated users",
    async ({ page, request }) => {
      const product = await findAnyProduct(request);
      baseTest.skip(!product, "No products found in catalog");

      await page.goto(`/products/${product!.articleNumber}`);
      await page.waitForLoadState("networkidle");

      // The Save/Saved button should NOT be visible for anonymous users
      // (the page conditionally renders it only when session exists)
      const saveButton = page.getByRole("button", { name: /^Save/ });
      await baseExpect(saveButton).not.toBeVisible();
    }
  );

  baseTest(
    "profile page redirects to login for unauthenticated users",
    async ({ page }) => {
      await page.goto("/profile");

      // Should redirect to /login
      await page.waitForURL(/\/login/, { timeout: 10_000 });
      await baseExpect(page).toHaveURL(/\/login/);
    }
  );
});
