import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateGuide, deleteGuide, addStep, deleteStep } from "@/lib/actions/guides";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const guide = await prisma.assemblyGuide.findUnique({
    where: { id },
    include: {
      product: { select: { product_name: true, article_number: true } },
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });

  if (!guide) return notFound();

  const updateGuideWithId = updateGuide.bind(null, guide.id);

  return (
    <div>
      <Link
        href="/studio/guides"
        className="text-sm text-muted-foreground hover:underline mb-4 inline-block"
      >
        &larr; Back to guides
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{guide.title}</h1>
          <p className="text-sm text-muted-foreground">
            {guide.product.product_name} ({guide.product.article_number})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={guide.published ? "default" : "outline"}>
            {guide.published ? "Published" : "Draft"}
          </Badge>
          <form action={deleteGuide.bind(null, guide.id)}>
            <Button type="submit" variant="destructive" size="sm">
              Delete
            </Button>
          </form>
        </div>
      </div>

      {/* Guide Settings */}
      <div className="rounded-lg border p-4 mb-8">
        <h2 className="font-semibold mb-4">Guide Settings</h2>
        <form action={updateGuideWithId} className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" defaultValue={guide.title} required className="mt-1" />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={guide.description ?? ""}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <select
                name="difficulty"
                id="difficulty"
                defaultValue={guide.difficulty}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <Label htmlFor="timeMinutes">Time (min)</Label>
              <Input
                id="timeMinutes"
                name="timeMinutes"
                type="number"
                min={1}
                defaultValue={guide.timeMinutes ?? ""}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="published">Status</Label>
              <select
                name="published"
                id="published"
                defaultValue={guide.published ? "true" : "false"}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="false">Draft</option>
                <option value="true">Published</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="tools">Tools Required</Label>
            <Input
              id="tools"
              name="tools"
              defaultValue={guide.tools ?? ""}
              className="mt-1"
            />
          </div>

          <Button type="submit" size="sm">Save Changes</Button>
        </form>
      </div>

      <Separator className="my-8" />

      {/* Steps */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Steps ({guide.steps.length})
        </h2>

        <div className="space-y-4 mb-8">
          {guide.steps.map((step) => (
            <div key={step.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold mr-2">
                    {step.stepNumber}
                  </span>
                  <span className="font-medium">{step.title}</span>
                </div>
                <form action={deleteStep.bind(null, step.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    Remove
                  </Button>
                </form>
              </div>
              <p className="mt-2 text-sm text-muted-foreground whitespace-pre-line">
                {step.instruction}
              </p>
              {step.tip && (
                <p className="mt-2 text-sm text-blue-600 bg-blue-50 rounded p-2">
                  Tip: {step.tip}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Add Step Form */}
        <div className="rounded-lg border border-dashed p-4">
          <h3 className="font-medium mb-3">Add Step</h3>
          <form action={addStep.bind(null, guide.id)} className="space-y-3">
            <div>
              <Label htmlFor="step-title">Step Title</Label>
              <Input
                id="step-title"
                name="title"
                required
                placeholder="e.g., Attach side panel"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="step-instruction">Instructions</Label>
              <textarea
                id="step-instruction"
                name="instruction"
                required
                rows={3}
                placeholder="Detailed instructions for this step..."
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div>
              <Label htmlFor="step-tip">Tip (optional)</Label>
              <Input
                id="step-tip"
                name="tip"
                placeholder="Helpful tip for this step..."
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="step-image">Image URL (optional)</Label>
              <Input
                id="step-image"
                name="imageUrl"
                placeholder="https://..."
                className="mt-1"
              />
            </div>
            <Button type="submit" size="sm">
              Add Step
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
