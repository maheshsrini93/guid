import { getRecentSyncLogs, getSyncSummary } from "@/lib/actions/sync-log";
import { RunSyncButton } from "./run-sync-button";

export default async function CatalogSyncPage() {
  const [summary, logs] = await Promise.all([
    getSyncSummary(),
    getRecentSyncLogs(10),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catalog Sync</h1>
          <p className="text-sm text-muted-foreground">
            Monthly catalog sync pipeline — detect new products, updated PDFs,
            and delisted items.
          </p>
        </div>
        <RunSyncButton />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Last Sync"
          value={
            summary.lastSyncDate
              ? new Date(summary.lastSyncDate).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "Never"
          }
          sub={
            summary.lastSyncErrors > 0
              ? `${summary.lastSyncErrors} error${summary.lastSyncErrors > 1 ? "s" : ""}`
              : undefined
          }
        />
        <SummaryCard
          label="New Products (This Month)"
          value={String(summary.newProductsThisMonth)}
        />
        <SummaryCard
          label="Total Products"
          value={summary.totalProducts.toLocaleString()}
        />
        <SummaryCard
          label="Guide Coverage"
          value={`${summary.guideCoveragePercent}%`}
          sub={`${summary.publishedGuides.toLocaleString()} published`}
        />
      </div>

      {/* Sync History Table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Sync History</h2>
        {logs.length === 0 ? (
          <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
            No sync runs yet. Click &ldquo;Run Sync Now&rdquo; to start the
            first catalog sync.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium text-right">New</th>
                  <th className="px-3 py-2 font-medium text-right">Updated</th>
                  <th className="px-3 py-2 font-medium text-right">Delisted</th>
                  <th className="px-3 py-2 font-medium text-right">
                    Jobs Queued
                  </th>
                  <th className="px-3 py-2 font-medium text-right">
                    PDF Updates
                  </th>
                  <th className="px-3 py-2 font-medium text-right">Errors</th>
                  <th className="px-3 py-2 font-medium text-right">Duration</th>
                  <th className="px-3 py-2 font-medium">Trigger</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b last:border-0">
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">
                      {new Date(log.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {log.newProducts}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {log.updatedProducts}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {log.delistedProducts}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {log.jobsQueued}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {log.pdfUpdates}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {log.errors > 0 ? (
                        <span className="text-destructive">{log.errors}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-mono text-xs">
                      {log.duration != null
                        ? log.duration >= 1000
                          ? `${(log.duration / 1000).toFixed(1)}s`
                          : `${log.duration}ms`
                        : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          log.triggeredBy === "manual"
                            ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {log.triggeredBy}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && (
        <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}
