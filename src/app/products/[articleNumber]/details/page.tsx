import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isProductSaved } from "@/lib/actions/saved-products";
import { Badge } from "@/components/ui/badge";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { SaveProductButton } from "@/components/save-product-button";
import { ProductDetailTabs } from "@/components/product-detail-tabs";
import { ProductJsonLd, BreadcrumbJsonLd } from "@/components/json-ld";
import { AlertTriangle, PenLine, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      guide_status: true,
      discontinued: true,
      package_width: true,
      package_height: true,
      package_length: true,
      package_weight: true,
      images: { orderBy: { sort_order: "asc" }, select: { id: true, url: true, alt_text: true, sort_order: true } },
      documents: { select: { id: true, document_type: true, source_url: true } },
    },
  });

  if (!product) return notFound();

  // Fetch related products: same category, exclude current, limit 8
  const relatedProducts = product.category_path
    ? await prisma.product.findMany({
        where: {
          category_path: { contains: product.category_path.split("/").slice(0, 3).join("/"), mode: "insensitive" },
          article_number: { not: articleNumber },
        },
        select: {
          article_number: true,
          product_name: true,
          product_type: true,
          price_current: true,
          guide_status: true,
          is_new: true,
          images: { take: 1, orderBy: { sort_order: "asc" }, select: { url: true } },
          assemblyGuide: { select: { published: true } },
        },
        orderBy: { avg_rating: "desc" },
        take: 8,
      })
    : [];

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
  ].filter((d): d is { label: string; value: string } => d.value != null);

  const packageDims = [
    { label: "Width", value: product.package_width },
    { label: "Height", value: product.package_height },
    { label: "Length", value: product.package_length },
    { label: "Weight", value: product.package_weight },
  ].filter((d): d is { label: string; value: string } => d.value != null);

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

      {/* Discontinued notice (P1.5.9) */}
      {product.discontinued && (
        <div className="mb-6 rounded-lg border border-muted-foreground/30 bg-muted p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            This product has been discontinued and may no longer be available.
          </p>
        </div>
      )}

      {/* Guide in Progress banner (P1.5.13) */}
      {(product.guide_status === "queued" || product.guide_status === "generating") && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 flex items-center gap-3">
          <div className="h-5 w-5 shrink-0 motion-safe:animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              Assembly guide being generated
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {product.guide_status === "queued"
                ? "This product is queued for AI guide generation. Check back shortly."
                : "Our AI is currently creating a step-by-step assembly guide for this product."}
            </p>
          </div>
        </div>
      )}

      {/* Guide in Review banner */}
      {product.guide_status === "in_review" && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4 flex items-center gap-3">
          <div className="h-5 w-5 shrink-0 rounded-full border-2 border-blue-400 flex items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Assembly guide under review
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              A guide has been generated and is being reviewed for quality. It will be available soon.
            </p>
          </div>
        </div>
      )}

      {/* Community Submission Received banner (P1.5.20) */}
      {product.guide_status === "submission_received" && (
        <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30 p-4 flex items-center gap-3">
          <Users className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" />
          <div>
            <p className="text-sm font-medium text-purple-900 dark:text-purple-200">
              Community guide submission received
            </p>
            <p className="text-xs text-purple-700 dark:text-purple-400">
              A community member has contributed assembly knowledge for this product. It&apos;s being reviewed.
            </p>
          </div>
        </div>
      )}

      {/* Hero: Images + Key Product Info */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Image Gallery */}
        <div>
          <ProductImageGallery
            images={product.images}
            productName={product.product_name || "Product"}
          />
        </div>

        {/* Product Header */}
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
        </div>
      </div>

      {/* Submit a Guide CTA (P1.5.14) — show when no guide pipeline is active */}
      {(product.guide_status === "no_source_material" || product.guide_status === "none" || !product.guide_status) &&
        !product.discontinued && (
          <div className="mt-8 rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center">
            <PenLine className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
            <h3 className="font-semibold text-lg">Know how to assemble this?</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {session
                ? "Share your assembly knowledge to help others build this product."
                : "Sign in to share your assembly knowledge and help others."}
            </p>
            {session ? (
              <Button asChild>
                <Link href={`/products/${product.article_number}/submit-guide`} className="cursor-pointer">
                  Submit a Guide
                </Link>
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <Link href="/login" className="cursor-pointer">Sign in to contribute</Link>
              </Button>
            )}
          </div>
      )}

      {/* Tabbed Content: Overview | Documents | Related Products */}
      <ProductDetailTabs
        description={product.description}
        materials={product.materials}
        careInstructions={product.care_instructions}
        goodToKnow={product.good_to_know}
        categoryPath={product.category_path}
        articleNumber={product.article_number}
        color={product.color}
        designer={product.designer}
        assemblyRequired={product.assembly_required}
        dimensions={dimensions}
        packageDims={packageDims}
        assemblyDocs={assemblyDocs}
        careDocs={careDocs}
        relatedProducts={relatedProducts.map((p) => ({
          articleNumber: p.article_number,
          name: p.product_name,
          productType: p.product_type,
          price: p.price_current,
          imageUrl: p.images[0]?.url ?? null,
          hasGuide: p.guide_status === "published" || p.assemblyGuide?.published === true,
          guideComingSoon: !p.assemblyGuide?.published && (p.guide_status === "queued" || p.guide_status === "generating"),
          isNew: p.is_new ?? false,
        }))}
      />
    </main>
  );
}
