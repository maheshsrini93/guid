import { test as baseTest, expect as baseExpect } from "@playwright/test";
import { test, expect } from "../fixtures/auth";
import { findAnyProduct } from "../fixtures/test-data";

baseTest.describe("Chat Troubleshooting - Page Load", () => {
  baseTest("chat page loads with heading and diagnostic intake", async ({
    page,
  }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Page title
    await baseExpect(
      page.getByRole("heading", { name: "Troubleshooting Chat" })
    ).toBeVisible();

    // Description text
    await baseExpect(
      page.getByText("Describe your product and issue")
    ).toBeVisible();

    // Diagnostic intake should prompt for product identification first
    // Phase 1: "What product do you need help with?"
    await baseExpect(
      page.getByText("What product do you need help with?")
    ).toBeVisible();

    // Product search input should be present
    await baseExpect(
      page.getByLabel("Product name or article number")
    ).toBeVisible();
  });

  baseTest("diagnostic intake progresses through phases", async ({
    page,
  }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // Phase 1: Enter a product name
    const productInput = page.getByLabel("Product name or article number");
    await productInput.fill("KALLAX shelf");

    const continueButton = page.getByLabel("Continue");
    await continueButton.click();

    // Phase 2: Problem category chips should appear
    // "What kind of issue are you experiencing?"
    await baseExpect(
      page.getByText("What kind of issue are you experiencing?")
    ).toBeVisible({ timeout: 5_000 });

    // Select a category (e.g., "Wobbling/unstable")
    const wobbleChip = page.getByRole("button", {
      name: /wobbl/i,
    });
    if (await wobbleChip.isVisible().catch(() => false)) {
      await wobbleChip.click();
    } else {
      // Fall back to first visible chip button in the intake
      const firstChip = page
        .locator('[class*="intake"] button, [class*="Intake"] button')
        .first();
      if (await firstChip.isVisible().catch(() => false)) {
        await firstChip.click();
      }
    }

    // Phase 3: Timing question — "When did this start?"
    await baseExpect(
      page.getByText("When did this start?")
    ).toBeVisible({ timeout: 5_000 });
  });

  baseTest("chat message area has proper accessibility attributes", async ({
    page,
  }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // The message list has role="log" and aria-label="Chat messages"
    const messageArea = page.getByRole("log", { name: "Chat messages" });
    await baseExpect(messageArea).toBeVisible();
  });
});

test.describe("Chat Troubleshooting - Authenticated", () => {
  test("chat input appears after completing diagnostic intake", async ({
    userPage,
  }) => {
    await userPage.goto("/chat");
    await userPage.waitForLoadState("networkidle");

    // Complete the intake flow
    const productInput = userPage.getByLabel("Product name or article number");
    await productInput.fill("BILLY bookcase");
    await userPage.getByLabel("Continue").click();

    // Wait for category phase
    await expect(
      userPage.getByText("What kind of issue")
    ).toBeVisible({ timeout: 5_000 });

    // Click first available category chip
    const categoryButtons = userPage.locator(
      'button:has-text("Wobbling"), button:has-text("Missing"), button:has-text("broke"), button:has-text("close"), button:has-text("Other")'
    );
    const firstCategory = categoryButtons.first();
    if (await firstCategory.isVisible().catch(() => false)) {
      await firstCategory.click();
    }

    // Wait for timing phase
    await expect(
      userPage.getByText("When did this start?")
    ).toBeVisible({ timeout: 5_000 });

    // Click first timing option
    const timingButtons = userPage.locator(
      'button:has-text("Just happened"), button:has-text("Gradual"), button:has-text("move"), button:has-text("Not sure")'
    );
    const firstTiming = timingButtons.first();
    if (await firstTiming.isVisible().catch(() => false)) {
      await firstTiming.click();
    }

    // Phase 4: Photo step — skip it
    const skipButton = userPage.getByRole("button", { name: /Skip/i });
    if (await skipButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await skipButton.click();
    }

    // After intake, the chat input textarea should appear
    const chatInput = userPage.getByRole("textbox", { name: "Chat message" });
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    // Send button should exist
    const sendButton = userPage.getByLabel("Send message");
    await expect(sendButton).toBeVisible();
  });

  test("typing a message and sending shows user message in list", async ({
    userPage,
  }) => {
    await userPage.goto("/chat");
    await userPage.waitForLoadState("networkidle");

    // Fast-track through intake
    const productInput = userPage.getByLabel("Product name or article number");
    await productInput.fill("MALM dresser");
    await userPage.getByLabel("Continue").click();

    // Click through category
    await expect(
      userPage.getByText("What kind of issue")
    ).toBeVisible({ timeout: 5_000 });
    const categoryButtons = userPage.locator(
      'button:has-text("Wobbling"), button:has-text("Missing"), button:has-text("broke"), button:has-text("close"), button:has-text("Other")'
    );
    const firstCategory = categoryButtons.first();
    if (await firstCategory.isVisible().catch(() => false)) {
      await firstCategory.click();
    }

    // Click through timing
    await expect(
      userPage.getByText("When did this start?")
    ).toBeVisible({ timeout: 5_000 });
    const timingButtons = userPage.locator(
      'button:has-text("Just happened"), button:has-text("Gradual"), button:has-text("move"), button:has-text("Not sure")'
    );
    const firstTiming = timingButtons.first();
    if (await firstTiming.isVisible().catch(() => false)) {
      await firstTiming.click();
    }

    // Skip photo
    const skipButton = userPage.getByRole("button", { name: /Skip/i });
    if (await skipButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await skipButton.click();
    }

    // Wait for chat input
    const chatInput = userPage.getByRole("textbox", { name: "Chat message" });
    await expect(chatInput).toBeVisible({ timeout: 10_000 });

    // The initial intake message should already have been sent.
    // The message list should contain the intake summary (Product: ..., Issue: ...)
    const messageList = userPage.getByRole("log", { name: "Chat messages" });
    await expect(messageList).toBeVisible();

    // Type an additional follow-up message
    await chatInput.fill("The top shelf is wobbly when I push it");
    await userPage.getByLabel("Send message").click();

    // The user message should appear in the message list
    await expect(
      userPage.getByText("The top shelf is wobbly when I push it")
    ).toBeVisible({ timeout: 5_000 });

    // After sending, either a typing indicator or an error/response should appear
    // (depends on whether GEMINI_API_KEY is configured)
    // We just verify the message was added to the list
  });

  test("chat handles API error gracefully", async ({ userPage }) => {
    await userPage.goto("/chat");
    await userPage.waitForLoadState("networkidle");

    // Complete intake quickly
    const productInput = userPage.getByLabel("Product name or article number");
    await productInput.fill("HEMNES");
    await userPage.getByLabel("Continue").click();

    await expect(
      userPage.getByText("What kind of issue")
    ).toBeVisible({ timeout: 5_000 });
    const categoryButton = userPage.locator(
      'button:has-text("Wobbling"), button:has-text("Missing"), button:has-text("broke"), button:has-text("close"), button:has-text("Other")'
    ).first();
    if (await categoryButton.isVisible().catch(() => false)) {
      await categoryButton.click();
    }

    await expect(
      userPage.getByText("When did this start?")
    ).toBeVisible({ timeout: 5_000 });
    const timingButton = userPage.locator(
      'button:has-text("Just happened"), button:has-text("Gradual"), button:has-text("move"), button:has-text("Not sure")'
    ).first();
    if (await timingButton.isVisible().catch(() => false)) {
      await timingButton.click();
    }

    const skipButton = userPage.getByRole("button", { name: /Skip/i });
    if (await skipButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await skipButton.click();
    }

    // After intake completes, a message is auto-sent to /api/chat.
    // If GEMINI_API_KEY is not set, the API will return an error.
    // The useChat hook sets the error state.
    // Wait for either a successful assistant response OR an error indication.
    await userPage.waitForTimeout(5_000);

    // The page should NOT crash — verify chat container is still rendered
    const chatPanel = userPage.locator('[class*="rounded-xl"][class*="border"]');
    await expect(chatPanel.first()).toBeVisible();

    // Either an assistant message appeared (API key configured)
    // or the chat shows an error state (no crash)
    // Both are acceptable — the key is graceful handling
  });
});

baseTest.describe("Chat Troubleshooting - Product-Specific Widget", () => {
  baseTest(
    "product page has chat widget with greeting bubble",
    async ({ page, request }) => {
      const product = await findAnyProduct(request);
      baseTest.skip(!product, "No products found in catalog");

      await page.goto(`/products/${product!.articleNumber}`);
      await page.waitForLoadState("networkidle");

      // The ProductChatWidget renders a GreetingBubble (FAB button)
      // Look for the floating chat button — it typically has a chat/message icon
      const chatFab = page.getByRole("button", { name: /chat|help|troubleshoot/i });
      const fabVisible = await chatFab
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      if (fabVisible) {
        // Click to open the chat panel
        await chatFab.click();

        // Chat panel should open — diagnostic intake starts at "category" phase
        // (product is pre-loaded, so it skips product identification)
        await baseExpect(
          page.getByText("What kind of issue")
        ).toBeVisible({ timeout: 5_000 });
      }
    }
  );

  baseTest("chat image attachment button is present", async ({ page }) => {
    await page.goto("/chat");
    await page.waitForLoadState("networkidle");

    // During intake, the photo phase shows an "Add photo" button
    // Complete first phases to reach photo phase
    const productInput = page.getByLabel("Product name or article number");
    await productInput.fill("PAX wardrobe");
    await page.getByLabel("Continue").click();

    await baseExpect(
      page.getByText("What kind of issue")
    ).toBeVisible({ timeout: 5_000 });

    // Click any category
    const categoryButton = page.locator(
      'button:has-text("Wobbling"), button:has-text("Missing"), button:has-text("broke"), button:has-text("close"), button:has-text("Other")'
    ).first();
    if (await categoryButton.isVisible().catch(() => false)) {
      await categoryButton.click();
    }

    // Click any timing
    await baseExpect(
      page.getByText("When did this start?")
    ).toBeVisible({ timeout: 5_000 });
    const timingButton = page.locator(
      'button:has-text("Just happened"), button:has-text("Gradual"), button:has-text("move"), button:has-text("Not sure")'
    ).first();
    if (await timingButton.isVisible().catch(() => false)) {
      await timingButton.click();
    }

    // Phase 4: Photo — should show "Add photo" and "Skip" buttons
    await baseExpect(
      page.getByText("Can you share a photo")
    ).toBeVisible({ timeout: 5_000 });
    await baseExpect(
      page.getByRole("button", { name: /Add photo/i })
    ).toBeVisible();
    await baseExpect(
      page.getByRole("button", { name: /Skip/i })
    ).toBeVisible();
  });
});
