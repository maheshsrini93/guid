import { test as setup, expect } from "@playwright/test";

const ADMIN_EMAIL = "admin@ikea-guide.local";
const ADMIN_PASSWORD = "admin123";
const TEST_USER_EMAIL = "e2e-test-user@guid.test";
const TEST_USER_PASSWORD = "testpass123";

const ADMIN_STATE = "e2e/.auth/admin.json";
const USER_STATE = "e2e/.auth/user.json";

/**
 * Pre-login admin user and save storageState.
 * This runs once before all test suites.
 */
setup("authenticate as admin", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  // Admin login redirects through studio layout — wait for any stable page
  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });

  await page.context().storageState({ path: ADMIN_STATE });
});

/**
 * Register (if needed) and login a test user, then save storageState.
 */
setup("authenticate as test user", async ({ page }) => {
  // Try registering — ignore if user already exists
  const res = await page.request.post("/api/auth/register", {
    data: {
      name: "E2E Test User",
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    },
  });

  // 200/201 = created, 409/400 = already exists — all fine
  const status = res.status();
  if (status !== 200 && status !== 201 && status !== 409 && status !== 400) {
    // Only fail if it's an unexpected error
    const body = await res.text();
    if (!body.includes("already exists") && !body.includes("already registered")) {
      throw new Error(`Registration failed unexpectedly: ${status} ${body}`);
    }
  }

  // Now login
  await page.goto("/login");
  await page.getByLabel("Email").fill(TEST_USER_EMAIL);
  await page.getByLabel("Password").fill(TEST_USER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL((url) => !url.pathname.includes("/login"), {
    timeout: 15_000,
  });

  await page.context().storageState({ path: USER_STATE });
});
