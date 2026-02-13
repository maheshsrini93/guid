import { Suspense } from "react";
import Link from "next/link";
import { BookOpen, Wrench, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/search-input";
import { OrganizationJsonLd, BreadcrumbJsonLd } from "@/components/json-ld";

async function getStats() {
  const [productCount, guideCount] = await Promise.all([
    prisma.product.count(),
    prisma.assemblyGuide.count({ where: { published: true } }),
  ]);
  return { productCount, guideCount };
}

export default async function HomePage() {
  const { productCount, guideCount } = await getStats();

  return (
    <main className="container mx-auto px-4 py-16">
      <OrganizationJsonLd />
      <BreadcrumbJsonLd items={[{ name: "Home", url: "https://guid.how" }]} />
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Find step-by-step instructions for any product
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Assembly guides, setup walkthroughs, and troubleshooting help
          — all in one place.
        </p>

        {/* Search bar */}
        <div className="mt-8 flex justify-center">
          <Suspense>
            <SearchInput />
          </Suspense>
        </div>

        {/* Stats */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span>{productCount.toLocaleString()} products</span>
          </div>
          {guideCount > 0 && (
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>{guideCount.toLocaleString()} guides</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4" />
            <span>Free to use</span>
          </div>
        </div>

        {/* CTA buttons */}
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/products">Browse Guides</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/register">Get Started</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
