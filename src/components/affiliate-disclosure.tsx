import { getAffiliateDisclosure } from "@/lib/affiliate";

interface AffiliateDisclosureProps {
  retailers: Array<{
    slug: string;
    affiliateConfig: unknown;
  }>;
}

/**
 * FTC-compliant affiliate disclosure.
 *
 * Renders a small disclosure notice when any of the displayed
 * retailers have active affiliate links. Shows per-retailer
 * disclosures as required by affiliate program terms.
 */
export function AffiliateDisclosure({ retailers }: AffiliateDisclosureProps) {
  const disclosures = retailers
    .map((r) => getAffiliateDisclosure(r.slug, r.affiliateConfig))
    .filter((d): d is string => d !== null);

  if (disclosures.length === 0) return null;

  return (
    <div className="mt-4 rounded-md border border-border/50 bg-muted/30 px-3 py-2">
      {disclosures.map((text, i) => (
        <p
          key={i}
          className="text-xs text-muted-foreground leading-relaxed"
        >
          {text}
        </p>
      ))}
    </div>
  );
}
