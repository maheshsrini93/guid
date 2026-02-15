import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E configuration for Guid.me
 *
 * - Single worker to avoid race conditions on shared Supabase DB
 * - Auth setup project runs first, saves storageState for reuse
 * - Desktop Chromium (primary) + iPhone 14 WebKit (mobile-tagged tests)
 * - webServer starts `npm run dev` automatically
 */
export default defineConfig({
  testDir: "./e2e/tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [["html", { open: "never" }], ["github"]]
    : [["html", { open: "on-failure" }]],

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Auth setup — runs first, saves storageState files
    {
      name: "auth-setup",
      testDir: "./e2e/fixtures",
      testMatch: "auth.setup.ts",
    },

    // Desktop Chromium — primary test target
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["auth-setup"],
    },

    // Mobile WebKit — only runs tests tagged @mobile
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"] },
      dependencies: ["auth-setup"],
      grep: /@mobile/,
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
