"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Check, ClipboardCopy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EscalationCardProps {
  sessionId: string | null;
}

interface EscalationData {
  productName: string | null;
  articleNumber: string | null;
  retailer: string | null;
  problemDescription: string;
  stepsTried: string[];
  hasPhotos: boolean;
  formattedText: string;
}

/**
 * Escalation card shown in the chat when the user requests
 * to escalate to manufacturer support. Generates a summary
 * from the chat session and offers copy-to-clipboard and
 * email draft options.
 */
export function EscalationCard({ sessionId }: EscalationCardProps) {
  const [data, setData] = useState<EscalationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateSummary = useCallback(async () => {
    if (!sessionId) {
      setError("No active chat session");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate summary");
      }

      const summary = await response.json();
      setData(summary);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate summary"
      );
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  const handleCopy = useCallback(async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.formattedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for environments without clipboard API
      const textarea = document.createElement("textarea");
      textarea.value = data.formattedText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [data]);

  const handleEmail = useCallback(() => {
    if (!data) return;
    const subject = encodeURIComponent(
      `Support Request: ${data.productName ?? "Product Issue"}${
        data.articleNumber ? ` (${data.articleNumber})` : ""
      }`
    );
    const body = encodeURIComponent(data.formattedText);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }, [data]);

  // Initial state — show the escalation trigger button
  if (!data && !loading) {
    return (
      <div className="mx-3 my-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              Need more help?
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate a support summary to send to the manufacturer.
              It includes your product info, problem description, and
              troubleshooting steps already tried.
            </p>
            {error && (
              <p className="mt-1 text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button
              size="sm"
              variant="outline"
              className="mt-2 cursor-pointer"
              onClick={generateSummary}
              disabled={loading || !sessionId}
            >
              Generate Support Summary
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="mx-3 my-2 rounded-lg border border-muted bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Generating support summary...
        </p>
      </div>
    );
  }

  // Summary generated — show with action buttons
  return (
    <div className="mx-3 my-2 rounded-lg border border-muted bg-muted/50 p-3">
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-500 dark:text-amber-400"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Support Summary Ready</p>

          {data?.productName && (
            <p className="mt-1 text-sm text-muted-foreground">
              Product: {data.productName}
              {data.articleNumber ? ` (${data.articleNumber})` : ""}
            </p>
          )}

          {data && data.stepsTried.length > 0 && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {data.stepsTried.length} troubleshooting step
              {data.stepsTried.length !== 1 ? "s" : ""} documented
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                  <span aria-live="polite">Copied</span>
                </>
              ) : (
                <>
                  <ClipboardCopy
                    className="mr-1.5 h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                  Copy to Clipboard
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={handleEmail}
            >
              <Mail className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Draft Email
            </Button>
          </div>

          {/* Collapsible preview of the summary text */}
          <details className="mt-3">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground motion-safe:transition-colors">
              Preview summary
            </summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-background p-2 text-xs font-mono leading-relaxed">
              {data?.formattedText}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
