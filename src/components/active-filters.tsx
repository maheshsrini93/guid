"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function ActiveFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function removeParam(key: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(key);
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  }

  const filters: { key: string; label: string }[] = [];

  if (searchParams.has("category")) {
    filters.push({ key: "category", label: `Category: ${searchParams.get("category")}` });
  }
  if (searchParams.has("minPrice")) {
    filters.push({ key: "minPrice", label: `Min $${searchParams.get("minPrice")}` });
  }
  if (searchParams.has("maxPrice")) {
    filters.push({ key: "maxPrice", label: `Max $${searchParams.get("maxPrice")}` });
  }
  if (searchParams.has("minRating")) {
    filters.push({ key: "minRating", label: `${searchParams.get("minRating")}+ stars` });
  }
  if (searchParams.get("assembly") === "true") {
    filters.push({ key: "assembly", label: "Assembly required" });
  }
  if (searchParams.get("hasAssemblyDocs") === "true") {
    filters.push({ key: "hasAssemblyDocs", label: "Has instructions" });
  }
  if (searchParams.get("new") === "true") {
    filters.push({ key: "new", label: "New products" });
  }
  if (searchParams.has("retailer")) {
    filters.push({ key: "retailer", label: `Retailer: ${searchParams.get("retailer")}` });
  }

  if (filters.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <Badge
          key={f.key}
          variant="secondary"
          className="cursor-pointer gap-1 min-h-[44px] px-3 py-2 sm:min-h-0 sm:py-0.5 sm:px-2"
          onClick={() => removeParam(f.key)}
        >
          {f.label}
          <span className="ml-1 text-xs">&times;</span>
        </Badge>
      ))}
    </div>
  );
}
