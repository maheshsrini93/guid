/**
 * JSON-LD structured data components for SEO.
 * Renders <script type="application/ld+json"> in page output.
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// --- Organization (homepage) ---

export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "Guid",
        url: "https://guid.how",
        description:
          "Step-by-step assembly, setup, and troubleshooting guides for any product.",
      }}
    />
  );
}

// --- BreadcrumbList ---

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}

// --- Product ---

interface ProductJsonLdProps {
  name: string;
  articleNumber: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string;
  brand?: string;
  rating?: number | null;
  reviewCount?: number | null;
  url: string;
}

export function ProductJsonLd({
  name,
  articleNumber,
  description,
  imageUrl,
  price,
  currency = "USD",
  brand = "IKEA",
  rating,
  reviewCount,
  url,
}: ProductJsonLdProps) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    sku: articleNumber,
    url,
    brand: { "@type": "Brand", name: brand },
  };

  if (description) data.description = description;
  if (imageUrl) data.image = imageUrl;

  if (price != null) {
    data.offers = {
      "@type": "Offer",
      price: price.toFixed(2),
      priceCurrency: currency,
      availability: "https://schema.org/InStock",
    };
  }

  if (rating != null && reviewCount != null && reviewCount > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: rating.toFixed(1),
      reviewCount,
    };
  }

  return <JsonLd data={data} />;
}

// --- HowTo (guide pages) ---

interface HowToStep {
  name: string;
  text: string;
  imageUrl?: string | null;
}

interface HowToJsonLdProps {
  name: string;
  description?: string | null;
  totalTimeMinutes?: number | null;
  tools?: string | null;
  steps: HowToStep[];
  url: string;
}

export function HowToJsonLd({
  name,
  description,
  totalTimeMinutes,
  tools,
  steps,
  url,
}: HowToJsonLdProps) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    url,
    step: steps.map((step, index) => {
      const stepData: Record<string, unknown> = {
        "@type": "HowToStep",
        position: index + 1,
        name: step.name,
        text: step.text,
      };
      if (step.imageUrl) stepData.image = step.imageUrl;
      return stepData;
    }),
  };

  if (description) data.description = description;

  if (totalTimeMinutes != null) {
    const hours = Math.floor(totalTimeMinutes / 60);
    const mins = totalTimeMinutes % 60;
    data.totalTime = `PT${hours > 0 ? `${hours}H` : ""}${mins}M`;
  }

  if (tools) {
    data.tool = tools.split(",").map((t) => ({
      "@type": "HowToTool",
      name: t.trim(),
    }));
  }

  return <JsonLd data={data} />;
}
