import { prisma } from "@/lib/prisma";
import type { RetailerAdapter } from "./types";
import { IkeaAdapter } from "./ikea-adapter";
import { WayfairAdapter } from "./wayfair-adapter";
import { HomeDepotAdapter } from "./homedepot-adapter";
import { AmazonAdapter } from "./amazon-adapter";
import { TargetAdapter } from "./target-adapter";

// Internal registry mapping slugs to adapter constructors
const adapterMap: Record<string, () => RetailerAdapter> = {
  ikea: () => new IkeaAdapter(),
  wayfair: () => new WayfairAdapter(),
  homedepot: () => new HomeDepotAdapter(),
  amazon: () => new AmazonAdapter(),
  target: () => new TargetAdapter(),
};

/** Get adapter for a specific retailer slug. Throws if unknown. */
export function getAdapter(slug: string): RetailerAdapter {
  const factory = adapterMap[slug];
  if (!factory) {
    throw new Error(`No adapter registered for retailer: ${slug}`);
  }
  return factory();
}

/** Register a new adapter (for dynamic registration). */
export function registerAdapter(slug: string, factory: () => RetailerAdapter): void {
  adapterMap[slug] = factory;
}

/** Get all active retailers and their adapters from the database. */
export async function getActiveAdapters(): Promise<Array<{ slug: string; adapter: RetailerAdapter }>> {
  const retailers = await prisma.retailer.findMany({
    where: { isActive: true },
    select: { slug: true },
  });

  return retailers
    .filter((r) => adapterMap[r.slug])
    .map((r) => ({ slug: r.slug, adapter: getAdapter(r.slug) }));
}
