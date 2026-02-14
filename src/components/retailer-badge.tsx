import Image from "next/image";

interface RetailerBadgeProps {
  retailerName: string;
  retailerSlug: string;
  logoUrl?: string | null;
  size?: "sm" | "default";
}

export function RetailerBadge({ retailerName, retailerSlug, logoUrl, size = "default" }: RetailerBadgeProps) {
  const height = size === "sm" ? 16 : 24;

  if (logoUrl) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 dark:border dark:border-border">
        <Image
          src={logoUrl}
          alt={`${retailerName} logo`}
          width={Math.round(height * 2.5)}
          height={height}
          className="object-contain"
        />
      </span>
    );
  }

  // Text fallback when no logo
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  return (
    <span className={`inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 ${textSize} font-medium text-muted-foreground`}>
      {retailerName}
    </span>
  );
}
