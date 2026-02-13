"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

interface ProductFiltersProps {
  categories: string[];
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  function clearAll() {
    router.push("/products");
  }

  const hasFilters =
    searchParams.has("category") ||
    searchParams.has("minPrice") ||
    searchParams.has("maxPrice") ||
    searchParams.has("minRating") ||
    searchParams.has("assembly") ||
    searchParams.has("hasAssemblyDocs") ||
    searchParams.has("new");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Filters</h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        )}
      </div>

      <Separator />

      {/* New Products */}
      <div>
        <div className="flex min-h-[44px] items-center gap-2 py-1">
          <Checkbox
            id="new-products"
            checked={searchParams.get("new") === "true"}
            onCheckedChange={(checked) =>
              updateParam("new", checked ? "true" : null)
            }
          />
          <Label
            htmlFor="new-products"
            className="text-sm font-normal cursor-pointer"
          >
            New Products
          </Label>
        </div>
      </div>

      <Separator />

      {/* Category */}
      <div>
        <h4 className="mb-2 text-sm font-medium">Category</h4>
        <div className="max-h-48 space-y-0 overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat} className="flex min-h-[44px] items-center gap-2 py-1">
              <Checkbox
                id={`cat-${cat}`}
                checked={searchParams.get("category") === cat}
                onCheckedChange={(checked) =>
                  updateParam("category", checked ? cat : null)
                }
              />
              <Label
                htmlFor={`cat-${cat}`}
                className="text-sm font-normal cursor-pointer line-clamp-1"
              >
                {cat}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <h4 className="mb-2 text-sm font-medium">Price Range</h4>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            className="h-11 sm:h-8 text-sm"
            defaultValue={searchParams.get("minPrice") ?? ""}
            onBlur={(e) => updateParam("minPrice", e.target.value || null)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParam("minPrice", (e.target as HTMLInputElement).value || null);
              }
            }}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            className="h-11 sm:h-8 text-sm"
            defaultValue={searchParams.get("maxPrice") ?? ""}
            onBlur={(e) => updateParam("maxPrice", e.target.value || null)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParam("maxPrice", (e.target as HTMLInputElement).value || null);
              }
            }}
          />
        </div>
      </div>

      <Separator />

      {/* Rating */}
      <div>
        <h4 className="mb-2 text-sm font-medium">Minimum Rating</h4>
        <div className="space-y-0">
          {[4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex min-h-[44px] items-center gap-2 py-1">
              <Checkbox
                id={`rating-${rating}`}
                checked={searchParams.get("minRating") === String(rating)}
                onCheckedChange={(checked) =>
                  updateParam("minRating", checked ? String(rating) : null)
                }
              />
              <Label
                htmlFor={`rating-${rating}`}
                className="text-sm font-normal cursor-pointer"
              >
                {rating}+ stars
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Assembly */}
      <div>
        <h4 className="mb-2 text-sm font-medium">Assembly</h4>
        <div className="space-y-0">
          <div className="flex min-h-[44px] items-center gap-2 py-1">
            <Checkbox
              id="assembly-required"
              checked={searchParams.get("assembly") === "true"}
              onCheckedChange={(checked) =>
                updateParam("assembly", checked ? "true" : null)
              }
            />
            <Label
              htmlFor="assembly-required"
              className="text-sm font-normal cursor-pointer"
            >
              Assembly required
            </Label>
          </div>
          <div className="flex min-h-[44px] items-center gap-2 py-1">
            <Checkbox
              id="assembly-docs"
              checked={searchParams.get("hasAssemblyDocs") === "true"}
              onCheckedChange={(checked) =>
                updateParam("hasAssemblyDocs", checked ? "true" : null)
              }
            />
            <Label
              htmlFor="assembly-docs"
              className="text-sm font-normal cursor-pointer"
            >
              Has assembly instructions
            </Label>
          </div>
        </div>
      </div>
    </div>
  );
}
