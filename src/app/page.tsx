import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="container mx-auto px-4 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Guid
        </h1>
        <p className="mt-2 text-xl text-muted-foreground font-medium">
          Product guides for everything.
        </p>
        <p className="mt-4 text-lg text-muted-foreground">
          Step-by-step assembly, setup, and troubleshooting guides
          for any product. Built by the community.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
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
