import { prisma } from "@/lib/prisma";
import { createGuide } from "@/lib/actions/guides";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function NewGuidePage() {
  // Get products that require assembly and don't already have a guide
  const products = await prisma.product.findMany({
    where: {
      assembly_required: true,
      assemblyGuide: null,
    },
    select: { id: true, product_name: true, article_number: true },
    orderBy: { product_name: "asc" },
    take: 200,
  });

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold mb-6">Create Assembly Guide</h1>

      <form action={createGuide} className="space-y-4">
        <div>
          <Label htmlFor="productId">Product</Label>
          <select
            name="productId"
            id="productId"
            required
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select a product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.product_name} ({p.article_number})
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required placeholder="e.g., KALLAX Shelf Assembly" className="mt-1" />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            name="description"
            rows={3}
            placeholder="Brief overview of the assembly process..."
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="difficulty">Difficulty</Label>
            <select
              name="difficulty"
              id="difficulty"
              defaultValue="medium"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <Label htmlFor="timeMinutes">Est. Time (minutes)</Label>
            <Input
              id="timeMinutes"
              name="timeMinutes"
              type="number"
              min={1}
              placeholder="e.g., 45"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="tools">Tools Required</Label>
          <Input
            id="tools"
            name="tools"
            placeholder="e.g., Phillips screwdriver, rubber mallet"
            className="mt-1"
          />
        </div>

        <Button type="submit">Create Guide</Button>
      </form>
    </div>
  );
}
