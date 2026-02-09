import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          IKEA Assembly Guide
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Browse 12,000+ IKEA products with assembly documents, dimensions,
          and detailed product information.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button asChild size="lg">
            <Link href="/products">Browse Products</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/studio">Studio</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
