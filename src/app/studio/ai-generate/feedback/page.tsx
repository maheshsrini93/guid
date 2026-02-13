import Link from "next/link";
import { getFeedbackSummary } from "@/lib/actions/ai-generation";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CORRECTION_CATEGORIES } from "@/lib/ai/types";

const categoryLabels = Object.fromEntries(
  CORRECTION_CATEGORIES.map((c) => [c.value, c.label])
);

export default async function FeedbackPage() {
  const summary = await getFeedbackSummary();

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/studio/ai-generate"
          className="text-sm text-muted-foreground hover:underline"
        >
          &larr; Back to AI Generate
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Reviewer Feedback</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Corrections made during guide review — use these patterns to improve
          AI prompts.
        </p>
      </div>

      {/* Summary stats */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total Corrections</p>
          <p className="mt-1 text-2xl font-bold font-mono">
            {summary.totalCorrections}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Jobs Corrected</p>
          <p className="mt-1 text-2xl font-bold font-mono">
            {summary.jobsWithCorrections}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Title Corrections</p>
          <p className="mt-1 text-2xl font-bold font-mono">
            {summary.byField.find((f) => f.field === "title")?.count ?? 0}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">
            Instruction Corrections
          </p>
          <p className="mt-1 text-2xl font-bold font-mono">
            {summary.byField.find((f) => f.field === "instruction")?.count ?? 0}
          </p>
        </div>
      </div>

      {summary.totalCorrections === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-lg font-medium">No corrections yet</p>
          <p className="text-sm mt-1">
            Corrections will appear here as reviewers edit AI-generated guide
            steps.
          </p>
        </div>
      ) : (
        <>
          {/* Corrections by category — horizontal bar chart */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold mb-3">
              Corrections by Category
            </h2>
            <div className="space-y-2">
              {summary.byCategory.map((item) => {
                const pct =
                  summary.totalCorrections > 0
                    ? (item.count / summary.totalCorrections) * 100
                    : 0;
                return (
                  <div key={item.category} className="flex items-center gap-3">
                    <span className="text-sm w-48 shrink-0 truncate">
                      {categoryLabels[item.category] || item.category}
                    </span>
                    <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-sm font-mono w-12 text-right shrink-0">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Recent corrections */}
          <div>
            <h2 className="text-sm font-semibold mb-3">
              Recent Corrections (Last 20)
            </h2>
            <div className="space-y-3">
              {summary.recentCorrections.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        Step {c.stepNumber}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {c.field}
                      </Badge>
                      <Badge className="text-xs">
                        {categoryLabels[c.category] || c.category}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {c.productName}{" "}
                    <span className="font-mono">{c.articleNumber}</span>
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2 mt-2">
                    <div className="rounded bg-destructive/10 p-2">
                      <p className="text-[10px] font-medium text-destructive mb-0.5">
                        Original (AI)
                      </p>
                      <p className="text-xs text-destructive line-clamp-3">
                        {c.originalValue}
                      </p>
                    </div>
                    <div className="rounded bg-green-500/10 dark:bg-green-500/20 p-2">
                      <p className="text-[10px] font-medium text-green-600 dark:text-green-400 mb-0.5">
                        Corrected (Human)
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 line-clamp-3">
                        {c.correctedValue}
                      </p>
                    </div>
                  </div>
                  {c.reviewerNotes && (
                    <p className="mt-2 text-xs text-muted-foreground italic">
                      Note: {c.reviewerNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
