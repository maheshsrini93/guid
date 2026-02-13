"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SORT_OPTIONS } from "@/lib/product-filters";

/**
 * Mobile bottom sheet for sort options.
 * Replaces the Select dropdown on screens < 640px for a native-app feel.
 * Each option is a 44px-tall touch target with a check indicator.
 */
export function MobileSortSheet() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "name_asc";

  function handleSelect(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", value);
    params.delete("page");
    router.push(`/products?${params.toString()}`);
    setOpen(false);
  }

  const currentLabel =
    SORT_OPTIONS.find((o) => o.value === current)?.label ?? "Sort";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="sm:hidden min-h-[44px] gap-1.5">
          <ArrowUpDown className="h-4 w-4" />
          <span className="max-w-[120px] truncate">{currentLabel}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-xl pb-8">
        <SheetHeader>
          <SheetTitle>Sort by</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-sm hover:bg-accent cursor-pointer text-left transition-colors duration-200 ease-out"
              onClick={() => handleSelect(opt.value)}
            >
              <span className={current === opt.value ? "font-semibold text-primary" : ""}>
                {opt.label}
              </span>
              {current === opt.value && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
