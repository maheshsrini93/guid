"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const role = (session.user as unknown as { role: string }).role;
  if (role !== "admin") throw new Error("Not authorized");
  return session.user;
}

/**
 * Manual single-product scrape action.
 * If product exists: updates last_scraped_at.
 * If product doesn't exist: creates a scrape_urls entry for the scraper to pick up.
 */
export async function manualProductScrape(articleNumber: string) {
  await requireAdmin();

  const cleaned = articleNumber.trim().replace(/\D/g, "");
  if (!cleaned || cleaned.length < 3) {
    return { success: false as const, error: "Invalid article number" };
  }

  // Check if product already exists
  const product = await prisma.product.findUnique({
    where: { article_number: cleaned },
    select: {
      id: true,
      article_number: true,
      product_name: true,
      guide_status: true,
      documents: {
        where: { document_type: "assembly" },
        select: { source_url: true },
        take: 1,
      },
    },
  });

  if (product) {
    // Product exists — update last_scraped_at
    await prisma.product.update({
      where: { id: product.id },
      data: { last_scraped_at: new Date() },
    });

    revalidatePath("/studio/ai-generate");
    return {
      success: true as const,
      product: {
        id: product.id,
        articleNumber: product.article_number,
        name: product.product_name,
        guideStatus: product.guide_status,
        hasAssemblyDoc: product.documents.length > 0,
      },
      scraped: true,
      queued: false,
    };
  }

  // Product doesn't exist — queue for scraping
  // TODO: P5.1.4 — use adapter registry to get retailer-specific URL
  const ikeaUrl = `https://www.ikea.com/us/en/p/-${cleaned}/`;

  // Check if already queued
  const existingEntry = await prisma.scrapeUrl.findUnique({
    where: { url: ikeaUrl },
    select: { id: true, status: true },
  });

  if (existingEntry) {
    return {
      success: true as const,
      product: null,
      scraped: false,
      queued: true,
      message:
        existingEntry.status === "pending"
          ? "Already queued for scraping"
          : `Scrape entry exists with status: ${existingEntry.status}`,
    };
  }

  await prisma.scrapeUrl.create({
    data: {
      url: ikeaUrl,
      article_number: cleaned,
      status: "pending",
    },
  });

  revalidatePath("/studio/ai-generate");
  return {
    success: true as const,
    product: null,
    scraped: false,
    queued: true,
    message: "Queued for scraping. The product will be available after the scraper processes it.",
  };
}
