import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function StudioGuidesPage() {
  const guides = await prisma.assemblyGuide.findMany({
    select: {
      id: true,
      title: true,
      published: true,
      updatedAt: true,
      product: { select: { product_name: true, article_number: true } },
      _count: { select: { steps: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Assembly Guides</h1>
          <p className="text-sm text-muted-foreground">
            {guides.length} guide{guides.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/studio/guides/new">New Guide</Link>
        </Button>
      </div>

      {guides.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">No assembly guides yet.</p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <Link href="/studio/guides/new">Create your first guide</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {guides.map((guide) => (
            <Link
              key={guide.id}
              href={`/studio/guides/${guide.id}`}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <h2 className="font-medium">{guide.title}</h2>
                <p className="text-sm text-muted-foreground">
                  {guide.product.product_name} ({guide.product.article_number})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {guide._count.steps} step{guide._count.steps !== 1 ? "s" : ""}
                </Badge>
                <Badge variant={guide.published ? "default" : "outline"}>
                  {guide.published ? "Published" : "Draft"}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
