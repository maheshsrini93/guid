"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfigForm } from "./config-form";

export function NewConfigButton() {
  const [isCreating, setIsCreating] = useState(false);

  if (isCreating) {
    return (
      <div className="w-full rounded-lg border p-5">
        <ConfigForm onCancel={() => setIsCreating(false)} />
      </div>
    );
  }

  return (
    <Button onClick={() => setIsCreating(true)} className="cursor-pointer shrink-0">
      New Config
    </Button>
  );
}
