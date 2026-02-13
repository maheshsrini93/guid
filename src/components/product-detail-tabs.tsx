"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import Link from "next/link";
import { FileText, Package, Grid3X3, Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/image-with-fallback";

interface ProductDocument {
  id: number;
  document_type: string;
  source_url: string;
}

interface Dimension {
  label: string;
  value: string;
}

interface RelatedProduct {
  articleNumber: string;
  name: string | null;
  productType: string | null;
  price: number | null;
  imageUrl: string | null;
  hasGuide: boolean;
  guideComingSoon: boolean;
}

interface ProductDetailTabsProps {
  description: string | null;
  materials: string | null;
  careInstructions: string | null;
  goodToKnow: string | null;
  categoryPath: string | null;
  articleNumber: string;
  color: string | null;
  designer: string | null;
  assemblyRequired: boolean | null;
  dimensions: Dimension[];
  packageDims: Dimension[];
  assemblyDocs: ProductDocument[];
  careDocs: ProductDocument[];
  relatedProducts: RelatedProduct[];
}

function RelatedProductsCarousel({ products }: { products: RelatedProduct[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.firstElementChild?.clientWidth ?? 240;
    el.scrollBy({
      left: direction === "left" ? -cardWidth - 16 : cardWidth + 16,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className="relative">
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="absolute -left-2 top-1/2 z-10 -translate-y-1/2 size-10 rounded-full bg-background shadow-md border cursor-pointer hidden sm:flex"
        >
          <ChevronLeft className="size-5" />
        </Button>
      )}

      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="absolute -right-2 top-1/2 z-10 -translate-y-1/2 size-10 rounded-full bg-background shadow-md border cursor-pointer hidden sm:flex"
        >
          <ChevronRight className="size-5" />
        </Button>
      )}

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-4 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="list"
        aria-label="Related products"
      >
        {products.map((product) => (
          <Link
            key={product.articleNumber}
            href={`/products/${product.articleNumber}`}
            className="group flex-none snap-start rounded-lg border bg-card p-3 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 w-[calc(66.67%-8px)] sm:w-[calc(50%-8px)] md:w-[calc(33.33%-11px)] lg:w-[calc(25%-12px)]"
            role="listitem"
          >
            <div className="relative mb-3 aspect-square overflow-hidden rounded-md bg-gray-50">
              {product.imageUrl ? (
                <ImageWithFallback
                  src={product.imageUrl}
                  alt={product.name || "Product"}
                  fill
                  sizes="(max-width: 640px) 66vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No image
                </div>
              )}
              {product.hasGuide && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-green-600 px-2 py-0.5 text-xs font-medium text-white">
                  <Check className="h-3 w-3" />
                  Guide
                </span>
              )}
              {product.guideComingSoon && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Soon
                </span>
              )}
            </div>
            <p className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {product.name || product.articleNumber}
            </p>
            {product.productType && (
              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                {product.productType}
              </p>
            )}
            {product.price != null && (
              <p className="mt-1 text-sm font-semibold font-mono">
                ${product.price.toFixed(2)}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

interface SpecRow {
  label: string;
  value: string;
  mono?: boolean;
}

function SpecTable({ rows, caption }: { rows: SpecRow[]; caption: string }) {
  if (rows.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" role="table">
        <caption className="sr-only">{caption}</caption>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.label}
              className={i % 2 === 0 ? "bg-muted/50" : ""}
            >
              <th
                scope="row"
                className="whitespace-nowrap px-4 py-2.5 text-left font-medium text-muted-foreground"
              >
                {row.label}
              </th>
              <td
                className={`px-4 py-2.5 text-right ${row.mono ? "font-mono" : ""}`}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProductDetailTabs({
  description,
  materials,
  careInstructions,
  goodToKnow,
  categoryPath,
  articleNumber,
  color,
  designer,
  assemblyRequired,
  dimensions,
  packageDims,
  assemblyDocs,
  careDocs,
  relatedProducts,
}: ProductDetailTabsProps) {
  const hasDocuments = assemblyDocs.length > 0 || careDocs.length > 0;

  // Build spec rows from available product data
  const generalSpecs: SpecRow[] = [
    { label: "Article Number", value: articleNumber, mono: true },
    ...(color ? [{ label: "Color", value: color }] : []),
    ...(designer ? [{ label: "Designer", value: designer }] : []),
    ...(materials ? [{ label: "Materials", value: materials }] : []),
    ...(assemblyRequired != null
      ? [{ label: "Assembly Required", value: assemblyRequired ? "Yes" : "No" }]
      : []),
  ];

  const productDimSpecs: SpecRow[] = dimensions.map((d) => ({
    label: d.label,
    value: d.value,
    mono: true,
  }));

  const packageDimSpecs: SpecRow[] = packageDims.map((d) => ({
    label: d.label,
    value: d.value,
    mono: true,
  }));

  const hasSpecs =
    generalSpecs.length > 0 ||
    productDimSpecs.length > 0 ||
    packageDimSpecs.length > 0;

  return (
    <Tabs defaultValue="overview" className="mt-8">
      <div className="sticky top-14 z-[var(--z-sticky)] bg-background pb-1">
        <TabsList variant="line" className="w-full justify-start overflow-x-auto">
          <TabsTrigger
            value="overview"
            className="cursor-pointer gap-1.5 px-4 py-2.5"
          >
            <Package className="size-4" aria-hidden="true" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="documents"
            className="cursor-pointer gap-1.5 px-4 py-2.5"
          >
            <FileText className="size-4" aria-hidden="true" />
            Documents
            {hasDocuments && (
              <span className="ml-1 inline-flex size-5 items-center justify-center rounded-full bg-muted text-xs font-mono">
                {assemblyDocs.length + careDocs.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="related"
            className="cursor-pointer gap-1.5 px-4 py-2.5"
          >
            <Grid3X3 className="size-4" aria-hidden="true" />
            Related Products
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Overview Tab */}
      <TabsContent value="overview" className="pt-6">
        <div className="space-y-6">
          {description && (
            <div>
              <h2 className="mb-2 font-semibold">Description</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line max-w-[72ch]">
                {description}
              </p>
            </div>
          )}

          {hasSpecs && (
            <div className="space-y-6">
              {generalSpecs.length > 0 && (
                <div>
                  <h2 className="mb-3 font-semibold">Specifications</h2>
                  <SpecTable rows={generalSpecs} caption="Product specifications" />
                </div>
              )}

              {productDimSpecs.length > 0 && (
                <div>
                  <h2 className="mb-3 font-semibold">Product Dimensions</h2>
                  <SpecTable rows={productDimSpecs} caption="Product dimensions" />
                </div>
              )}

              {packageDimSpecs.length > 0 && (
                <div>
                  <h2 className="mb-3 font-semibold">Package Dimensions</h2>
                  <SpecTable rows={packageDimSpecs} caption="Package dimensions" />
                </div>
              )}
            </div>
          )}

          {careInstructions && (
            <div>
              <h2 className="mb-2 font-semibold">Care Instructions</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {careInstructions}
              </p>
            </div>
          )}

          {goodToKnow && (
            <div>
              <h2 className="mb-2 font-semibold">Good to Know</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {goodToKnow}
              </p>
            </div>
          )}

          {categoryPath && (
            <p className="text-xs text-muted-foreground">{categoryPath}</p>
          )}
        </div>
      </TabsContent>

      {/* Documents Tab */}
      <TabsContent value="documents" className="pt-6">
        {!hasDocuments ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <FileText className="size-12 text-muted-foreground" aria-hidden="true" />
            <p className="font-semibold">No Documents Available</p>
            <p className="text-sm text-muted-foreground">
              No assembly instructions or care documents are available for this
              product.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {assemblyDocs.length > 0 && (
              <div>
                <h2 className="mb-3 font-semibold">Assembly Instructions</h2>
                <div className="flex flex-wrap gap-3">
                  {assemblyDocs.map((doc, i) => (
                    <Button
                      key={doc.id}
                      variant="outline"
                      asChild
                      className="cursor-pointer"
                    >
                      <a
                        href={doc.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText className="mr-2 size-4" aria-hidden="true" />
                        Assembly Instructions{assemblyDocs.length > 1 ? ` (${i + 1})` : ""} (PDF)
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {careDocs.length > 0 && (
              <div>
                <h2 className="mb-3 font-semibold">Care Instructions</h2>
                <div className="flex flex-wrap gap-3">
                  {careDocs.map((doc, i) => (
                    <Button
                      key={doc.id}
                      variant="outline"
                      asChild
                      className="cursor-pointer"
                    >
                      <a
                        href={doc.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText className="mr-2 size-4" aria-hidden="true" />
                        Care Instructions{careDocs.length > 1 ? ` (${i + 1})` : ""} (PDF)
                      </a>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </TabsContent>

      {/* Related Products Tab */}
      <TabsContent value="related" className="pt-6">
        {relatedProducts.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Grid3X3 className="size-12 text-muted-foreground" aria-hidden="true" />
            <p className="font-semibold">No Related Products</p>
            <p className="text-sm text-muted-foreground">
              No related products found in this category.
            </p>
          </div>
        ) : (
          <RelatedProductsCarousel products={relatedProducts} />
        )}
      </TabsContent>
    </Tabs>
  );
}
