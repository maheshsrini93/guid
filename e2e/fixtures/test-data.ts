import type { Page, APIRequestContext } from "@playwright/test";

export interface ProductResult {
  articleNumber: string;
  name: string;
  type: string;
  price: number | null;
  imageUrl: string | null;
}

/**
 * Find a product that has a published assembly guide.
 * Returns null if no such product exists.
 */
export async function findProductWithGuide(
  request: APIRequestContext
): Promise<ProductResult | null> {
  // Search for common products likely to have guides
  const queries = ["KALLAX", "BILLY", "MALM", "HEMNES", "PAX"];

  for (const q of queries) {
    const res = await request.get(`/api/search?q=${q}`);
    if (res.ok()) {
      const data = await res.json();
      if (data.results?.length > 0) {
        // Check each result for a published guide
        for (const product of data.results.slice(0, 3)) {
          const pageRes = await request.get(
            `/products/${product.articleNumber}`
          );
          if (pageRes.ok()) {
            const html = await pageRes.text();
            // If the page has guide viewer content, it has a published guide
            if (
              html.includes("assembly-guide-viewer") ||
              html.includes("step-navigation") ||
              html.includes("Step 1")
            ) {
              return product;
            }
          }
        }
      }
    }
  }

  return null;
}

/**
 * Find any product from the catalog (doesn't need a guide).
 */
export async function findAnyProduct(
  request: APIRequestContext
): Promise<ProductResult | null> {
  const res = await request.get("/api/search?q=KALLAX");
  if (res.ok()) {
    const data = await res.json();
    if (data.results?.length > 0) {
      return data.results[0];
    }
  }
  return null;
}

/**
 * Helper to wait for search API response after typing in SearchInput.
 * Handles the 300ms debounce.
 */
export async function searchAndWait(
  page: Page,
  query: string
): Promise<void> {
  const searchInput = page.getByRole("combobox", { name: "Search products" });
  await searchInput.fill(query);

  // Wait for the debounced API call to complete
  await page.waitForResponse(
    (res) => res.url().includes("/api/search") && res.status() === 200,
    { timeout: 10_000 }
  );
}
