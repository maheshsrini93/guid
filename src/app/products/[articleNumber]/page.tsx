import { Metadata } from "next";
import dynamic from "next/dynamic";
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
import { ProductInfoCard } from "@/components/product-info-card";
import {
  ProductJsonLd,
  HowToJsonLd,
  BreadcrumbJsonLd,
} from "@/components/json-ld";
import { AlertTriangle, PenLine, Users } from "lucide-react";
import { AdSlot } from "@/components/ad-slot";
import { RequestGuideButton } from "@/components/request-guide-button";
import { isPremiumUser } from "@/lib/subscription";

// Dynamic imports for heavy client components — code-split into separate chunks
const ProductChatWidget = dynamic(
  () => import("@/components/chat").then((mod) => mod.ProductChatWidget),
  { loading: () => null }
);

const GuideViewer = dynamic(
  () => import("@/components/guide-viewer").then((mod) => mod.GuideViewer),
  { loading: () => <div className="motion-safe:animate-pulse rounded-lg bg-muted h-96" /> }
);

const AssemblyGuideViewer = dynamic(
  () =>
    import("@/components/assembly-guide-viewer").then(
      (mod) => mod.AssemblyGuideViewer
    ),
  { loading: () => <div className="motion-safe:animate-pulse rounded-lg bg-muted h-48" /> }
);

// ISR: revalidate individual product/guide pages every 24 hours
export const revalidate = 86400;

interface ProductPageProps {
  params: Promise<{ articleNumber: string }>;
}

// --- SEO: P2.0.6 — guide-first meta tags ---

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { articleNumber } = await params;
  const product = await prisma.product.findUnique({
    where: { article_number: articleNumber },
    select: {
      product_name: true,
      product_type: true,
      description: true,
      guide_status: true,
      images: { take: 1, orderBy: { sort_order: "asc" }, select: { url: true } },
      assemblyGuide: {
        select: {
          published: true,
          title: true,
          difficulty: true,
          timeMinutes: true,
          tools: true,
          _count: { select: { steps: true } },
        },
      },
    },
  });

  if (!product) return {};

  const name = product.product_name || "Product";
  const guide = product.assemblyGuide;
  const canonicalUrl = `https://guid.how/products/${articleNumber}`;
  const imageUrl = product.images[0]?.url;

  // Guide-first meta tags when a published guide exists
  if (
    product.guide_status === "published" &&
    guide?.published
  ) {
    const parts: string[] = [];
    parts.push(`${guide._count.steps}-step guide`);
    if (guide.difficulty) parts.push(`${guide.difficulty} difficulty`);
    if (guide.timeMinutes) parts.push(`~${guide.timeMinutes} min`);
    if (guide.tools) parts.push(`Tools: ${guide.tools}`);

    const title = `How to Assemble ${name} — Step-by-Step Guide`;
    const description = `Follow our ${parts.join(", ")} to assemble the ${name}. Clear instructions with illustrations for every step.`;

    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: "article",
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

  // Fallback: product-focused meta tags
  const fallbackTitle = `${name}`;
  const fallbackDesc =
    product.description?.slice(0, 160) ||
    `View details and assembly information for ${name}${product.product_type ? ` (${product.product_type})` : ""}.`;

  return {
    title: fallbackTitle,
    description: fallbackDesc,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: fallbackTitle,
      description: fallbackDesc,
      url: canonicalUrl,
      type: "website",
      ...(imageUrl && { images: [{ url: imageUrl, alt: name }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: fallbackTitle,
      description: fallbackDesc,
      ...(imageUrl && { images: [imageUrl] }),
    },
  };
}

// --- Page: P2.0.1 — guide-first routing ---

export default async function ProductPage({
  params,
}: ProductPageProps) {
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
      guide_status: true,
      discontinued: true,
      images: { orderBy: { sort_order: "asc" }, select: { id: true, url: true, alt_text: true, sort_order: true } },
      documents: { select: { id: true, document_type: true, source_url: true } },
      assemblyGuide: {
        select: {
          id: true,
          title: true,
          description: true,
          difficulty: true,
          timeMinutes: true,
          tools: true,
          published: true,
          aiGenerated: true,
          steps: {
            orderBy: { stepNumber: "asc" },
            select: {
              id: true,
              stepNumber: true,
              title: true,
              instruction: true,
              tip: true,
              imageUrl: true,
            },
          },
        },
      },
      guideSubmissions: {
        where: { status: "processing" },
        take: 1,
        select: { user: { select: { name: true } } },
      },
    },
  });

  if (!product) return notFound();

  // Guide-first: render guide viewer when published
  const hasPublishedGuide =
    product.guide_status === "published" &&
    product.assemblyGuide?.published === true;

  if (hasPublishedGuide && product.assemblyGuide) {
    // Get session for progress saving (P2.2.13)
    const guideSession = await auth();
    const guideUserId = guideSession?.user
      ? (guideSession.user as unknown as { id: string }).id
      : null;

    // Find the first available dimension for the info card
    const dimensionEntry = [
      { label: "Width", value: product.product_width },
      { label: "Height", value: product.product_height },
      { label: "Depth", value: product.product_depth },
      { label: "Length", value: product.product_length },
    ].find((d) => d.value);

    const baseUrl = "https://guid.how";
    const productUrl = `${baseUrl}/products/${product.article_number}`;

    return (
      <main className="container mx-auto px-4 py-8">
        <BreadcrumbJsonLd
          items={[
            { name: "Home", url: baseUrl },
            { name: "Products", url: `${baseUrl}/products` },
            {
              name: product.product_name || product.article_number,
              url: productUrl,
            },
          ]}
        />
        <HowToJsonLd
          name={`How to Assemble ${product.product_name || "Product"}`}
          description={product.assemblyGuide.description}
          totalTimeMinutes={product.assemblyGuide.timeMinutes}
          tools={product.assemblyGuide.tools}
          steps={product.assemblyGuide.steps.map((s) => ({
            name: s.title,
            text: s.instruction,
            imageUrl: s.imageUrl,
          }))}
          url={productUrl}
        />
        <ProductJsonLd
          name={product.product_name || "Product"}
          articleNumber={product.article_number}
          description={product.description}
          imageUrl={product.images[0]?.url}
          price={product.price_current}
          rating={product.avg_rating}
          reviewCount={product.review_count}
          url={productUrl}
        />

        {/* Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/products" className="hover:underline">
            Products
          </Link>
          <span>/</span>
          <span className="text-foreground">
            {product.product_name || product.article_number}
          </span>
        </nav>

        {/* Discontinued notice */}
        {product.discontinued && (
          <div className="mb-6 rounded-lg border border-muted-foreground/30 bg-muted p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              This product has been discontinued and may no longer be available.
            </p>
          </div>
        )}

        {/* Accessible h1 for the guide-first view */}
        <h1 className="sr-only">
          How to Assemble {product.product_name || "Product"} — Step-by-Step Guide
        </h1>

        {/* Three-column guide viewer (handles its own responsive layout) */}
        <GuideViewer
          title={product.assemblyGuide.title}
          description={product.assemblyGuide.description}
          difficulty={product.assemblyGuide.difficulty}
          timeMinutes={product.assemblyGuide.timeMinutes}
          tools={product.assemblyGuide.tools}
          aiGenerated={product.assemblyGuide.aiGenerated}
          communityContributed={product.guideSubmissions.length > 0}
          contributorName={product.guideSubmissions[0]?.user?.name}
          steps={product.assemblyGuide.steps}
          guideId={product.assemblyGuide.id}
          userId={guideUserId}
          articleNumber={product.article_number}
          productName={product.product_name}
          sidebarExtra={
            <ProductInfoCard
              articleNumber={product.article_number}
              productName={product.product_name || "Unknown Product"}
              imageUrl={product.images[0]?.url}
              price={product.price_current}
              dimension={dimensionEntry?.value}
              dimensionLabel={dimensionEntry?.label}
            />
          }
        />

        {/* Chat widget (P3.3.6) */}
        <ProductChatWidget
          product={{
            productId: product.id,
            articleNumber: product.article_number,
            productName: product.product_name || "Product",
            imageUrl: product.images[0]?.url,
          }}
        />
      </main>
    );
  }

  // Fallback: render product detail page (no published guide)
  const session = await auth();
  const saved = session ? await isProductSaved(product.id) : false;
  const userId = session?.user
    ? (session.user as unknown as { id: string }).id
    : null;
  const premium = userId ? await isPremiumUser(userId) : false;

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

  const fallbackBaseUrl = "https://guid.how";
  const fallbackProductUrl = `${fallbackBaseUrl}/products/${product.article_number}`;

  return (
    <main className="container mx-auto px-4 py-8">
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: fallbackBaseUrl },
          { name: "Products", url: `${fallbackBaseUrl}/products` },
          {
            name: product.product_name || product.article_number,
            url: fallbackProductUrl,
          },
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
        url={fallbackProductUrl}
      />

      {/* Breadcrumbs */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/products" className="hover:underline">
          Products
        </Link>
        <span>/</span>
        <span className="text-foreground">
          {product.product_name || product.article_number}
        </span>
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
            {product.color && (
              <Badge variant="outline">{product.color}</Badge>
            )}
            {product.designer && (
              <Badge variant="secondary">by {product.designer}</Badge>
            )}
            {product.avg_rating != null && (
              <Badge variant="secondary">
                {product.avg_rating.toFixed(1)} ({product.review_count}{" "}
                reviews)
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

          {/* Ad slot — hidden for premium users */}
          <AdSlot size="inline" className="my-6" />

          {/* Submit a Guide CTA + Request AI Guide (P1.5.14, P4.3.3) */}
          {(product.guide_status === "no_source_material" || product.guide_status === "none" || !product.guide_status) &&
            !product.assemblyGuide?.published &&
            !product.discontinued && (
              <>
                <Separator className="my-6" />
                {session ? (
                  <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center">
                    <PenLine className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-lg">Know how to assemble this?</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Share your assembly knowledge to help others build this product.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <Button asChild>
                        <Link href={`/products/${product.article_number}/submit-guide`} className="cursor-pointer">
                          Submit a Guide
                        </Link>
                      </Button>
                      {assemblyDocs.length > 0 && (
                        <RequestGuideButton
                          productId={product.id}
                          isPremium={premium}
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-muted-foreground/30 p-6 text-center">
                    <PenLine className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                    <h3 className="font-semibold text-lg">Know how to assemble this?</h3>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                      Sign in to share your assembly knowledge and help others.
                    </p>
                    <Button variant="outline" asChild>
                      <Link href="/login" className="cursor-pointer">Sign in to contribute</Link>
                    </Button>
                  </div>
                )}
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

          {/* Assembly Guide (inline, for products without guide-first routing) */}
          {product.assemblyGuide && product.assemblyGuide.published && (
            <>
              <Separator className="my-6" />
              <AssemblyGuideViewer
                title={product.assemblyGuide.title}
                description={product.assemblyGuide.description}
                difficulty={product.assemblyGuide.difficulty}
                timeMinutes={product.assemblyGuide.timeMinutes}
                tools={product.assemblyGuide.tools}
                steps={product.assemblyGuide.steps}
              />
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

      {/* Chat widget (P3.3.6) */}
      <ProductChatWidget
        product={{
          productId: product.id,
          articleNumber: product.article_number,
          productName: product.product_name || "Product",
          imageUrl: product.images[0]?.url,
        }}
      />
    </main>
  );
}
