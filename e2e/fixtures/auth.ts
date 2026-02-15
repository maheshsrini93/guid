import { test as base, type Page, type BrowserContext } from "@playwright/test";

/**
 * Custom fixtures that provide pre-authenticated page objects.
 *
 * Usage in test files:
 *   import { test, expect } from "../fixtures/auth";
 *   test("admin can see studio", async ({ adminPage }) => { ... });
 */

type AuthFixtures = {
  adminPage: Page;
  userPage: Page;
  adminContext: BrowserContext;
  userContext: BrowserContext;
};

export const test = base.extend<AuthFixtures>({
  adminContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/admin.json",
    });
    await use(context);
    await context.close();
  },

  adminPage: async ({ adminContext }, use) => {
    const page = await adminContext.newPage();
    await use(page);
  },

  userContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: "e2e/.auth/user.json",
    });
    await use(context);
    await context.close();
  },

  userPage: async ({ userContext }, use) => {
    const page = await userContext.newPage();
    await use(page);
  },
});

export { expect } from "@playwright/test";
