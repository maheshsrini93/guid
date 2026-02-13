import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChevronRight } from "lucide-react";
import { SubmitGuideForm } from "./submit-guide-form";

interface SubmitGuidePageProps {
  params: Promise<{ articleNumber: string }>;
}

export async function generateMetadata({
  params,
}: SubmitGuidePageProps): Promise<Metadata> {
  const { articleNumber } = await params;
  const product = await prisma.product.findUnique({
    where: { article_number: articleNumber },
    select: { product_name: true },
  });

  return {
    title: product
      ? `Submit Guide for ${product.product_name} | Guid`
      : "Submit Guide | Guid",
    description: "Share your assembly knowledge to help others.",
  };
}

export default async function SubmitGuidePage({
  params,
}: SubmitGuidePageProps) {
  const { articleNumber } = await params;

  // Auth gate: redirect to login if not signed in
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=/products/${articleNumber}/submit-guide`);
  }

  const product = await prisma.product.findUnique({
    where: { article_number: articleNumber },
    select: {
      id: true,
      product_name: true,
      article_number: true,
      guide_status: true,
    },
  });

  if (!product) notFound();

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1 text-sm text-muted-foreground">
          <li>
            <Link href="/products" className="hover:text-foreground">
              Products
            </Link>
          </li>
          <li>
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </li>
          <li>
            <Link
              href={`/products/${product.article_number}`}
              className="hover:text-foreground"
            >
              {product.product_name || product.article_number}
            </Link>
          </li>
          <li>
            <ChevronRight className="size-3.5" aria-hidden="true" />
          </li>
          <li aria-current="page" className="text-foreground font-medium">
            Submit Guide
          </li>
        </ol>
      </nav>

      <h1 className="text-2xl font-semibold tracking-tight">
        Submit a Guide
      </h1>
      <p className="mt-2 text-muted-foreground">
        Help others assemble{" "}
        <span className="font-medium text-foreground">
          {product.product_name}
        </span>{" "}
        <span className="font-mono text-xs text-muted-foreground">
          ({product.article_number})
        </span>{" "}
        by sharing your assembly instructions, video links, or other resources.
      </p>

      <SubmitGuideForm
        productId={product.id}
        articleNumber={product.article_number}
      />
    </main>
  );
}
