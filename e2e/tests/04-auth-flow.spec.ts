import { test, expect } from "@playwright/test";
import { test as authTest, expect as authExpect } from "../fixtures/auth";

test.describe("Login flow", () => {
  test("login page renders with form fields", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: "Sign in to Studio" })
    ).toBeVisible();

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Sign in" })
    ).toBeVisible();
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("nonexistent@example.com");
    await page.getByLabel("Password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Error message appears
    await expect(
      page.locator("p.text-destructive")
    ).toContainText("Invalid email or password", { timeout: 10_000 });
  });

  test("login with valid admin credentials redirects to /studio", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByLabel("Email").fill("admin@ikea-guide.local");
    await page.getByLabel("Password").fill("admin123");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Should redirect to /studio on success
    await expect(page).toHaveURL(/\/studio/, { timeout: 15_000 });
  });

  test("login page has link to register", async ({ page }) => {
    await page.goto("/login");

    // Scope to main content to avoid matching the header nav "Register" link
    const registerLink = page.locator("main").getByRole("link", { name: "Register" });
    await expect(registerLink).toBeVisible();
    await registerLink.click();
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe("Registration flow", () => {
  test("register page renders with form fields", async ({ page }) => {
    await page.goto("/register");

    await expect(
      page.getByRole("heading", { name: "Create an account" })
    ).toBeVisible();

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create account" })
    ).toBeVisible();
  });

  test("register with new unique email succeeds", async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@guid.test`;

    await page.goto("/register");

    await page.getByLabel("Name").fill("E2E Test User");
    await page.getByLabel("Email").fill(uniqueEmail);
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();

    // Auto-login redirects to /products after registration
    await expect(page).toHaveURL(/\/products/, { timeout: 15_000 });
  });

  test("register with existing email shows error", async ({ page }) => {
    await page.goto("/register");

    // Use the known admin email that already exists
    await page.getByLabel("Email").fill("admin@ikea-guide.local");
    await page.getByLabel("Password").fill("testpassword123");
    await page.getByRole("button", { name: "Create account" }).click();

    // Should show duplicate account error
    await expect(page.locator("p.text-destructive")).toContainText(
      /already exists/i,
      { timeout: 10_000 }
    );
  });

  test("register with short password shows client-side validation", async ({
    page,
  }) => {
    await page.goto("/register");

    await page.getByLabel("Email").fill("short@guid.test");
    await page.getByLabel("Password").fill("abc");
    await page.getByRole("button", { name: "Create account" }).click();

    // The <input minLength={6}> will prevent submission via native validation
    // or the server returns an error
    // Check that we're still on /register (form didn't submit successfully)
    await expect(page).toHaveURL(/\/register/);
  });

  test("register page has link to login", async ({ page }) => {
    await page.goto("/register");

    // Scope to main content to avoid matching the header nav "Sign in" link
    const signInLink = page.locator("main").getByRole("link", { name: "Sign in" });
    await expect(signInLink).toBeVisible();
    await signInLink.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Auth-gated routes", () => {
  test("unauthenticated /profile redirects to /login", async ({ page }) => {
    await page.goto("/profile");

    // Server-side redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });

  test("unauthenticated /studio redirects to /login", async ({ page }) => {
    await page.goto("/studio");

    // Studio layout checks auth + admin role; unauthenticated redirects to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});

authTest.describe("Authenticated session", () => {
  authTest("admin can access /studio", async ({ adminPage }) => {
    await adminPage.goto("/studio");

    // Should see the Studio sidebar with "Dashboard" link
    await authExpect(
      adminPage.getByRole("link", { name: "Dashboard" })
    ).toBeVisible();
  });

  authTest("sign out button logs out user", async ({ adminPage }) => {
    await adminPage.goto("/");

    // Header should show "Sign out" for authenticated users
    const signOutButton = adminPage.getByRole("button", {
      name: "Sign out",
    });
    await authExpect(signOutButton).toBeVisible();
    await signOutButton.click();

    // After sign out, should be redirected to home with "Sign in" link visible
    await authExpect(adminPage).toHaveURL("/", { timeout: 10_000 });
    await authExpect(
      adminPage.getByRole("link", { name: "Sign in" })
    ).toBeVisible({ timeout: 10_000 });
  });
});
