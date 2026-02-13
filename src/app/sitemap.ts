import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = "https://guid.how";
const PRODUCTS_PER_SITEMAP = 5000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/login`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/register`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Product pages — fetch all article numbers
  // For 12k+ products, we select only what's needed for the sitemap
  const products = await prisma.product.findMany({
    select: {
      article_number: true,
      updated_at: true,
      guide_status: true,
    },
    orderBy: { updated_at: "desc" },
    take: PRODUCTS_PER_SITEMAP,
  });

  const productPages: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/products/${p.article_number}`,
    lastModified: p.updated_at ?? undefined,
    changeFrequency: p.guide_status === "published" ? "weekly" : "monthly",
    priority: p.guide_status === "published" ? 0.8 : 0.6,
  }));

  return [...staticPages, ...productPages];
}
