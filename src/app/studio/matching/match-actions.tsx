"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Unlink, Play, Link2 } from "lucide-react";
import {
  runMatchingPipeline,
  unlinkProduct,
  manuallyLinkProducts,
} from "@/lib/actions/matching";

interface RunPipelineProps {
  mode: "run-pipeline";
}

interface UnlinkProps {
  mode: "unlink";
  productId: number;
  productName: string;
}

interface ManualLinkProps {
  mode: "manual-link";
}

type MatchActionsProps = RunPipelineProps | UnlinkProps | ManualLinkProps;

export function MatchActions(props: MatchActionsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [linkInputs, setLinkInputs] = useState({ idA: "", idB: "" });
  const router = useRouter();

  if (props.mode === "run-pipeline") {
    return (
      <div className="flex items-center gap-3">
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {summary && (
          <p className="text-sm text-muted-foreground">{summary}</p>
        )}
        <button
          onClick={() => {
            setError(null);
            setSummary(null);
            startTransition(async () => {
              const result = await runMatchingPipeline();
              if ("error" in result) {
                setError(result.error);
              } else {
                const s = result.summary;
                setSummary(
                  `Found ${s.exactMatches} exact + ${s.fuzzyAutoMatches} fuzzy matches, ${s.fuzzyReviewMatches} for review (${s.durationMs}ms)`
                );
                router.refresh();
              }
            });
          }}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          Run Matching
        </button>
      </div>
    );
  }

  if (props.mode === "unlink") {
    return (
      <button
        onClick={() => {
          startTransition(async () => {
            const result = await unlinkProduct(props.productId);
            if ("error" in result) {
              setError(result.error);
            } else {
              router.refresh();
            }
          });
        }}
        disabled={isPending}
        className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
        aria-label={`Unlink ${props.productName}`}
        title="Remove from match group"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
        ) : (
          <Unlink className="h-4 w-4" />
        )}
      </button>
    );
  }

  // Manual link mode
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        placeholder="Product ID A"
        value={linkInputs.idA}
        onChange={(e) => setLinkInputs((p) => ({ ...p, idA: e.target.value }))}
        className="w-28 rounded-md border bg-background px-2 py-1.5 text-sm font-mono"
        aria-label="Product ID A"
      />
      <Link2 className="h-4 w-4 text-muted-foreground" />
      <input
        type="number"
        placeholder="Product ID B"
        value={linkInputs.idB}
        onChange={(e) => setLinkInputs((p) => ({ ...p, idB: e.target.value }))}
        className="w-28 rounded-md border bg-background px-2 py-1.5 text-sm font-mono"
        aria-label="Product ID B"
      />
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <button
        onClick={() => {
          const idA = parseInt(linkInputs.idA, 10);
          const idB = parseInt(linkInputs.idB, 10);
          if (isNaN(idA) || isNaN(idB)) {
            setError("Enter valid product IDs");
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await manuallyLinkProducts(idA, idB);
            if ("error" in result) {
              setError(result.error);
            } else {
              setLinkInputs({ idA: "", idB: "" });
              router.refresh();
            }
          });
        }}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
        ) : (
          <Link2 className="h-4 w-4" />
        )}
        Link
      </button>
    </div>
  );
}
