"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleSaveProduct } from "@/lib/actions/saved-products";

interface SaveProductButtonProps {
  productId: number;
  initialSaved: boolean;
}

export function SaveProductButton({ productId, initialSaved }: SaveProductButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const result = await toggleSaveProduct(productId);
      if ("saved" in result && result.saved !== undefined) {
        setSaved(result.saved);
      }
    });
  }

  return (
    <Button
      variant={saved ? "default" : "outline"}
      size="sm"
      onClick={handleClick}
      disabled={isPending}
    >
      {saved ? "Saved" : "Save"}
    </Button>
  );
}
