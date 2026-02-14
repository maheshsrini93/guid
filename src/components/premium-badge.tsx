import { Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PremiumBadgeProps {
  className?: string;
  size?: "sm" | "default";
}

export function PremiumBadge({ className, size = "default" }: PremiumBadgeProps) {
  return (
    <Badge
      className={cn(
        "gap-1 bg-primary/15 text-primary dark:bg-primary/25",
        size === "sm" && "px-1.5 py-0 text-[10px]",
        className
      )}
      variant="secondary"
    >
      <Crown
        className={cn("shrink-0", size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")}
        aria-hidden="true"
      />
      Premium
    </Badge>
  );
}
