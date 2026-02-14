import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { RetailerActions } from "./retailer-actions";

interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerDay: number;
}

function isRateLimitConfig(val: unknown): val is RateLimitConfig {
  return (
    typeof val === "object" &&
    val !== null &&
    "requestsPerMinute" in val &&
    "requestsPerDay" in val
  );
}

export default async function RetailersPage() {
  const retailers = await prisma.retailer.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  // Get error counts from recent sync logs (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const syncStats = await prisma.catalogSyncLog.groupBy({
    by: ["retailer"],
    _sum: { errors: true, newProducts: true, updatedProducts: true },
    _count: true,
    where: { createdAt: { gte: thirtyDaysAgo } },
  });

  const syncStatsMap = new Map(
    syncStats.map((s) => [
      s.retailer,
      {
        totalSyncs: s._count,
        totalErrors: s._sum.errors ?? 0,
        newProducts: s._sum.newProducts ?? 0,
        updatedProducts: s._sum.updatedProducts ?? 0,
      },
    ])
  );

  const totalActive = retailers.filter((r) => r.isActive).length;
  const totalProducts = retailers.reduce((sum, r) => sum + r._count.products, 0);
  const totalErrors = syncStats.reduce(
    (sum, s) => sum + (s._sum.errors ?? 0),
    0
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Retailer Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage retailer adapters, sync settings, and health metrics.
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total Retailers</p>
          <p className="mt-1 text-2xl font-bold font-mono">{retailers.length}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Active</p>
          <p className="mt-1 text-2xl font-bold font-mono">{totalActive}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total Products</p>
          <p className="mt-1 text-2xl font-bold font-mono">
            {totalProducts.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Errors (30d)</p>
          <p className="mt-1 text-2xl font-bold font-mono">{totalErrors}</p>
        </div>
      </div>

      {/* Retailer list */}
      {retailers.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No retailers configured. Add retailers to the database to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {retailers.map((retailer) => {
            const stats = syncStatsMap.get(retailer.slug);
            const rlConfig = isRateLimitConfig(retailer.rateLimitConfig)
              ? retailer.rateLimitConfig
              : null;

            return (
              <div
                key={retailer.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {retailer.logoUrl && (
                        <div className="h-6 w-6 shrink-0 rounded bg-muted flex items-center justify-center overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={retailer.logoUrl}
                            alt=""
                            className="h-5 w-5 object-contain"
                          />
                        </div>
                      )}
                      <h3 className="font-medium">{retailer.name}</h3>
                      <Badge
                        variant="outline"
                        className={
                          retailer.isActive
                            ? "bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {retailer.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {retailer.slug}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {retailer.baseUrl}
                    </p>
                  </div>
                </div>

                {/* Metrics row */}
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>
                    Adapter:{" "}
                    <span className="font-mono font-medium text-foreground">
                      {retailer.adapterType}
                    </span>
                  </span>
                  <span>
                    Products:{" "}
                    <span className="font-mono font-medium text-foreground">
                      {retailer._count.products.toLocaleString()}
                    </span>
                  </span>
                  {retailer.lastSyncAt && (
                    <span>
                      Last sync:{" "}
                      <span className="font-medium text-foreground">
                        {retailer.lastSyncAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  )}
                  {stats && (
                    <>
                      <span>
                        Syncs (30d):{" "}
                        <span className="font-mono font-medium text-foreground">
                          {stats.totalSyncs}
                        </span>
                      </span>
                      {stats.totalErrors > 0 && (
                        <span className="text-destructive">
                          Errors:{" "}
                          <span className="font-mono font-medium">
                            {stats.totalErrors}
                          </span>
                        </span>
                      )}
                    </>
                  )}
                  {rlConfig && (
                    <span>
                      Rate limit:{" "}
                      <span className="font-mono font-medium text-foreground">
                        {rlConfig.requestsPerMinute}/min, {rlConfig.requestsPerDay}/day
                      </span>
                    </span>
                  )}
                </div>

                {/* Actions */}
                <RetailerActions
                  retailerId={retailer.id}
                  isActive={retailer.isActive}
                  rateLimitConfig={rlConfig}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
