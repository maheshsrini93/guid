import { prisma } from "@/lib/prisma";

/**
 * Affiliate configuration stored in Retailer.affiliateConfig JSON.
 *
 * Each retailer has its own affiliate parameters:
 * - Amazon: { tag: "guid-20", programName: "Amazon Associates" }
 * - Wayfair: { nid: "WAYFAIR_NID", programName: "Wayfair Partner" }
 */
interface AffiliateConfig {
  /** Amazon Associates tag */
  tag?: string;
  /** Wayfair NID / affiliate ID */
  nid?: string;
  /** Generic affiliate ID for other programs */
  affiliateId?: string;
  /** Human-readable program name */
  programName?: string;
  /** Whether affiliate is enabled for this retailer */
  enabled?: boolean;
}

/** Runtime type guard for AffiliateConfig from JSON. */
function isAffiliateConfig(val: unknown): val is AffiliateConfig {
  if (!val || typeof val !== "object") return false;
  const obj = val as Record<string, unknown>;
  return (
    (obj.tag === undefined || typeof obj.tag === "string") &&
    (obj.nid === undefined || typeof obj.nid === "string") &&
    (obj.affiliateId === undefined || typeof obj.affiliateId === "string")
  );
}

/**
 * Build an affiliate-tagged URL for a product.
 *
 * Reads the retailer's `affiliateConfig` JSON and appends
 * the appropriate tracking parameters to the product URL.
 */
export async function buildAffiliateUrl(
  productUrl: string,
  retailerSlug: string
): Promise<{ url: string; hasAffiliate: boolean; programName: string | null }> {
  const retailer = await prisma.retailer.findUnique({
    where: { slug: retailerSlug },
    select: { affiliateConfig: true },
  });

  if (!retailer?.affiliateConfig) {
    return { url: productUrl, hasAffiliate: false, programName: null };
  }

  if (!isAffiliateConfig(retailer.affiliateConfig)) {
    return { url: productUrl, hasAffiliate: false, programName: null };
  }

  const config = retailer.affiliateConfig;

  if (config.enabled === false) {
    return { url: productUrl, hasAffiliate: false, programName: null };
  }

  const tagged = appendAffiliateParams(productUrl, retailerSlug, config);

  return {
    url: tagged,
    hasAffiliate: true,
    programName: config.programName ?? null,
  };
}

/**
 * Build affiliate URL synchronously when config is already available.
 *
 * Used by components that have already fetched the retailer data.
 */
export function buildAffiliateUrlSync(
  productUrl: string,
  retailerSlug: string,
  affiliateConfig: unknown
): { url: string; hasAffiliate: boolean } {
  if (!isAffiliateConfig(affiliateConfig)) {
    return { url: productUrl, hasAffiliate: false };
  }

  if (affiliateConfig.enabled === false) {
    return { url: productUrl, hasAffiliate: false };
  }

  const tagged = appendAffiliateParams(productUrl, retailerSlug, affiliateConfig);
  return { url: tagged, hasAffiliate: !!affiliateConfig.tag || !!affiliateConfig.nid || !!affiliateConfig.affiliateId };
}

/**
 * Append retailer-specific affiliate parameters to a URL.
 */
function appendAffiliateParams(
  url: string,
  retailerSlug: string,
  config: AffiliateConfig
): string {
  try {
    const parsed = new URL(url);

    switch (retailerSlug) {
      case "amazon": {
        // Amazon Associates: append ?tag=ASSOCIATE_TAG
        if (config.tag) {
          parsed.searchParams.set("tag", config.tag);
        }
        break;
      }
      case "wayfair": {
        // Wayfair Partner Program: append nid parameter
        if (config.nid) {
          parsed.searchParams.set("nid", config.nid);
        }
        break;
      }
      default: {
        // Generic affiliate: append affiliate_id parameter
        if (config.affiliateId) {
          parsed.searchParams.set("ref", config.affiliateId);
        }
        break;
      }
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
}

/**
 * Get disclosure text for a retailer's affiliate program.
 *
 * Returns FTC-compliant disclosure text, or null if no affiliate active.
 */
export function getAffiliateDisclosure(
  retailerSlug: string,
  affiliateConfig: unknown
): string | null {
  if (!isAffiliateConfig(affiliateConfig)) return null;
  if (affiliateConfig.enabled === false) return null;

  switch (retailerSlug) {
    case "amazon":
      if (affiliateConfig.tag) {
        return "As an Amazon Associate, Guid earns from qualifying purchases.";
      }
      break;
    case "wayfair":
      if (affiliateConfig.nid) {
        return "Guid participates in the Wayfair Partner Program and may earn commissions on purchases.";
      }
      break;
    default:
      if (affiliateConfig.affiliateId) {
        return "Guid may earn a commission when you purchase through our links.";
      }
      break;
  }

  return null;
}

/**
 * Record an affiliate click for analytics tracking.
 *
 * Fire-and-forget — errors don't affect the user experience.
 */
export async function trackAffiliateClick(params: {
  retailerSlug: string;
  productId: number;
  userId?: string;
  sessionId?: string;
}): Promise<void> {
  try {
    await prisma.searchEvent.create({
      data: {
        eventType: "affiliate_click",
        query: params.retailerSlug,
        method: "affiliate",
        clickedId: params.productId,
        userId: params.userId ?? null,
        sessionId: params.sessionId ?? null,
      },
    });
  } catch {
    // Fire-and-forget — don't throw on tracking failures
  }
}
