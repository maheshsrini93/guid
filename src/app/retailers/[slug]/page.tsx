import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Check, ExternalLink, Loader2, Package, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isValidImageUrl } from "@/lib/image-utils";

const PAGE_SIZE = 24;

interface RetailerPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

async function getRetailer(slug: string) {
  return prisma.retailer.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      baseUrl: true,
      isActive: true,
    },
  });
}

export async function generateMetadata({
  params,
}: RetailerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const retailer = await getRetailer(slug);
  if (!retailer) return { title: "Retailer Not Found" };

  const title = `Assembly Guides for ${retailer.name} Products | Guid`;
  const description = `Browse step-by-step assembly guides for ${retailer.name} products. Find instructions for furniture, shelving, storage, and more.`;

  return {
    title,
    description,
    alternates: { canonical: `https://guid.how/retailers/${retailer.slug}` },
    openGraph: {
      title,
      description,
      url: `https://guid.how/retailers/${retailer.slug}`,
      ...(retailer.logoUrl ? { images: [{ url: retailer.logoUrl, alt: `${retailer.name} logo` }] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function RetailerPage({
  params,
  searchParams,
}: RetailerPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const retailer = await getRetailer(slug);

  if (!retailer || !retailer.isActive) {
    notFound();
  }

  const page = Math.max(1, parseInt(sp.page || "1", 10));

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where: { retailerId: retailer.id },
      select: {
        id: true,
        article_number: true,
        product_name: true,
        product_type: true,
        price_current: true,
        assembly_required: true,
        guide_status: true,
        is_new: true,
        images: {
          take: 1,
          orderBy: { sort_order: "asc" },
          select: { url: true },
        },
        assemblyGuide: { select: { published: true } },
      },
      orderBy: { product_name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.product.count({ where: { retailerId: retailer.id } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const guidesAvailable = await prisma.product.count({
    where: {
      retailerId: retailer.id,
      OR: [
        { guide_status: "published" },
        { assemblyGuide: { published: true } },
      ],
    },
  });

  function paginationUrl(targetPage: number) {
    return `/retailers/${slug}?page=${targetPage}`;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Retailer Header */}
      <div className="mb-8">
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link
                href="/"
                className="transition-colors duration-200 ease-out hover:text-foreground"
              >
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link
                href="/products"
                className="transition-colors duration-200 ease-out hover:text-foreground"
              >
                Products
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-semibold text-foreground">{retailer.name}</li>
          </ol>
        </nav>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Retailer Logo */}
          <div className="flex h-24 w-48 shrink-0 items-center justify-center rounded-lg border bg-card p-4">
            {retailer.logoUrl ? (
              <Image
                src={retailer.logoUrl}
                alt={`${retailer.name} logo`}
                width={160}
                height={64}
                className="h-auto max-h-16 w-auto object-contain"
                priority
              />
            ) : (
              <Store className="h-12 w-12 text-muted-foreground" />
            )}
          </div>

          {/* Retailer Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold">{retailer.name}</h1>
            <p className="mt-1 text-muted-foreground">
              Browse assembly guides for {retailer.name} products
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Package className="h-4 w-4" aria-hidden="true" />
                <span>
                  <span className="font-mono font-semibold text-foreground">
                    {total.toLocaleString()}
                  </span>{" "}
                  products
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>
                  <span className="font-mono font-semibold text-foreground">
                    {guidesAvailable.toLocaleString()}
                  </span>{" "}
                  guides available
                </span>
              </div>
              {retailer.baseUrl && (
                <a
                  href={retailer.baseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary transition-colors duration-200 ease-out hover:text-primary/80"
                >
                  Visit {retailer.name}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-lg font-medium">No products yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Products from {retailer.name} will appear here once they are synced.
          </p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/products">Browse all products</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product, index) => (
              <Link
                key={product.id}
                href={`/products/${product.article_number}`}
                className="group cursor-pointer rounded-lg border p-4 transition-all duration-200 ease-out hover:border-primary/30 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {isValidImageUrl(product.images[0]?.url) ? (
                  <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md bg-muted">
                    <Image
                      src={product.images[0].url}
                      alt={product.product_name || "Product"}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                      className="object-contain"
                      loading={index < 4 ? "eager" : "lazy"}
                      priority={index < 4}
                    />
                    {product.is_new && (
                      <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                        New
                      </span>
                    )}
                    {(product.guide_status === "published" ||
                      product.assemblyGuide?.published) && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                        <Check className="h-3 w-3" />
                        Guide
                      </span>
                    )}
                    {!product.assemblyGuide?.published &&
                      (product.guide_status === "queued" ||
                        product.guide_status === "generating") && (
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                          <Loader2 className="h-3 w-3 motion-safe:animate-spin" />
                          Coming Soon
                        </span>
                      )}
                  </div>
                ) : (
                  <div className="relative mb-3 flex aspect-square w-full items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
                    No image
                    {product.is_new && (
                      <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                        New
                      </span>
                    )}
                    {(product.guide_status === "published" ||
                      product.assemblyGuide?.published) && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                        <Check className="h-3 w-3" />
                        Guide
                      </span>
                    )}
                  </div>
                )}
                <h2 className="line-clamp-1 font-medium group-hover:underline">
                  {product.product_name || "Unknown"}
                </h2>
                {product.product_type && (
                  <p className="line-clamp-1 text-sm text-muted-foreground">
                    {product.product_type}
                  </p>
                )}
                <div className="mt-2 flex items-center justify-between">
                  {product.price_current != null && (
                    <span className="font-semibold">
                      ${product.price_current.toFixed(2)}
                    </span>
                  )}
                  {product.assembly_required && (
                    <Badge variant="secondary">Assembly</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] sm:min-h-0"
                  asChild
                >
                  <Link href={paginationUrl(page - 1)}>Previous</Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <Button
                  variant="outline"
                  size="sm"
                  className="min-h-[44px] sm:min-h-0"
                  asChild
                >
                  <Link href={paginationUrl(page + 1)}>Next</Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}
