import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProductSaved } from "@/lib/actions/saved-products";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { SaveProductButton } from "@/components/save-product-button";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/json-ld";

// ISR: revalidate product detail pages every 24 hours
export const revalidate = 86400;

interface DetailsPageProps {
  params: Promise<{ articleNumber: string }>;
}

export async function generateMetadata({
  params,
}: DetailsPageProps): Promise<Metadata> {
  const { articleNumber } = await params;
  const product = await prisma.product.findUnique({
    where: { article_number: articleNumber },
    select: {
      product_name: true,
      product_type: true,
      description: true,
      images: { take: 1, orderBy: { sort_order: "asc" }, select: { url: true } },
    },
  });

  if (!product) return {};

  const name = product.product_name || "Product";
  const title = `${name} — Product Details`;
  const description =
    product.description?.slice(0, 160) ||
    `View details, specs, and documents for ${name}${product.product_type ? ` (${product.product_type})` : ""}.`;
  const canonicalUrl = `https://guid.how/products/${articleNumber}/details`;
  const imageUrl = product.images[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      ...(imageUrl && { images: [{ url: imageUrl, alt: name }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

export default async function ProductDetailsPage({
  params,
}: DetailsPageProps) {
  const { articleNumber } = await params;

  const product = await prisma.product.findUnique({
    where: { article_number: articleNumber },
    select: {
      id: true,
      article_number: true,
      product_name: true,
      product_type: true,
      description: true,
      color: true,
      designer: true,
      materials: true,
      care_instructions: true,
      good_to_know: true,
      category_path: true,
      price_current: true,
      price_original: true,
      avg_rating: true,
      review_count: true,
      assembly_required: true,
      product_width: true,
      product_height: true,
      product_depth: true,
      product_length: true,
      product_weight: true,
      package_width: true,
      package_height: true,
      package_length: true,
      package_weight: true,
      images: { orderBy: { sort_order: "asc" }, select: { id: true, url: true, alt_text: true, sort_order: true } },
      documents: { select: { id: true, document_type: true, source_url: true } },
    },
  });

  if (!product) return notFound();

  const session = await auth();
  const saved = session ? await isProductSaved(product.id) : false;

  const assemblyDocs = product.documents.filter(
    (d) => d.document_type === "assembly"
  );
  const careDocs = product.documents.filter(
    (d) => d.document_type === "care"
  );

  const dimensions = [
    { label: "Width", value: product.product_width },
    { label: "Height", value: product.product_height },
    { label: "Depth", value: product.product_depth },
    { label: "Length", value: product.product_length },
    { label: "Weight", value: product.product_weight },
  ].filter((d) => d.value);

  const packageDims = [
    { label: "Width", value: product.package_width },
    { label: "Height", value: product.package_height },
    { label: "Length", value: product.package_length },
    { label: "Weight", value: product.package_weight },
  ].filter((d) => d.value);

  const baseUrl = "https://guid.how";
  const detailsUrl = `${baseUrl}/products/${product.article_number}/details`;

  return (
    <main className="container mx-auto px-4 py-8">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: baseUrl },
          { name: "Products", url: `${baseUrl}/products` },
          {
            name: product.product_name || product.article_number,
            url: `${baseUrl}/products/${product.article_number}`,
          },
          { name: "Details", url: detailsUrl },
        ]}
      />
      <ProductJsonLd
        name={product.product_name || "Product"}
        articleNumber={product.article_number}
        description={product.description}
        imageUrl={product.images[0]?.url}
        price={product.price_current}
        rating={product.avg_rating}
        reviewCount={product.review_count}
        url={detailsUrl}
      />

      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/products" className="hover:underline">
          Products
        </Link>
        <span>/</span>
        <Link
          href={`/products/${product.article_number}`}
          className="hover:underline"
        >
          {product.product_name || product.article_number}
        </Link>
        <span>/</span>
        <span className="text-foreground">Details</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Images */}
        <div>
          <ProductImageGallery
            images={product.images}
            productName={product.product_name || "Product"}
          />
        </div>

        {/* Details */}
        <div>
          <p className="text-sm text-muted-foreground font-mono">
            {product.article_number}
          </p>
          <h1 className="text-3xl font-bold">
            {product.product_name || "Unknown Product"}
          </h1>
          {product.product_type && (
            <p className="text-lg text-muted-foreground">
              {product.product_type}
            </p>
          )}

          <div className="mt-4 flex items-baseline gap-3">
            {product.price_current != null && (
              <span className="text-3xl font-bold">
                ${product.price_current.toFixed(2)}
              </span>
            )}
            {product.price_original != null &&
              product.price_original !== product.price_current && (
                <span className="text-lg text-muted-foreground line-through">
                  ${product.price_original.toFixed(2)}
                </span>
              )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {session && (
              <SaveProductButton
                productId={product.id}
                initialSaved={saved}
              />
            )}
            {product.assembly_required && (
              <Badge>Assembly Required</Badge>
            )}
            {product.color && <Badge variant="outline">{product.color}</Badge>}
            {product.designer && (
              <Badge variant="secondary">by {product.designer}</Badge>
            )}
            {product.avg_rating != null && (
              <Badge variant="secondary">
                {product.avg_rating.toFixed(1)} ({product.review_count} reviews)
              </Badge>
            )}
          </div>

          {product.description && (
            <>
              <Separator className="my-6" />
              <div>
                <h2 className="mb-2 font-semibold">Description</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            </>
          )}

          {/* Documents */}
          {(assemblyDocs.length > 0 || careDocs.length > 0) && (
            <>
              <Separator className="my-6" />
              <div>
                <h2 className="mb-3 font-semibold">Documents</h2>
                <div className="flex flex-wrap gap-2">
                  {assemblyDocs.map((doc) => (
                    <Button
                      key={doc.id}
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={doc.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Assembly Instructions (PDF)
                      </a>
                    </Button>
                  ))}
                  {careDocs.map((doc) => (
                    <Button
                      key={doc.id}
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={doc.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Care Instructions (PDF)
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Dimensions */}
          {dimensions.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h2 className="mb-3 font-semibold">Product Dimensions</h2>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {dimensions.map((d) => (
                    <div key={d.label}>
                      <dt className="text-muted-foreground">{d.label}</dt>
                      <dd className="font-medium">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          )}

          {packageDims.length > 0 && (
            <>
              <Separator className="my-6" />
              <div>
                <h2 className="mb-3 font-semibold">Package Dimensions</h2>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {packageDims.map((d) => (
                    <div key={d.label}>
                      <dt className="text-muted-foreground">{d.label}</dt>
                      <dd className="font-medium">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          )}

          {/* Additional Info */}
          {(product.materials ||
            product.care_instructions ||
            product.good_to_know) && (
            <>
              <Separator className="my-6" />
              {product.materials && (
                <div className="mb-4">
                  <h2 className="mb-2 font-semibold">Materials</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {product.materials}
                  </p>
                </div>
              )}
              {product.care_instructions && (
                <div className="mb-4">
                  <h2 className="mb-2 font-semibold">Care Instructions</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {product.care_instructions}
                  </p>
                </div>
              )}
              {product.good_to_know && (
                <div className="mb-4">
                  <h2 className="mb-2 font-semibold">Good to Know</h2>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {product.good_to_know}
                  </p>
                </div>
              )}
            </>
          )}

          {product.category_path && (
            <>
              <Separator className="my-6" />
              <p className="text-xs text-muted-foreground">
                {product.category_path}
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
