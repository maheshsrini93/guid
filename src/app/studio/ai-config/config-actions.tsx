"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { activateConfig, deactivateConfig, deleteConfig } from "@/lib/actions/ai-config";
import { ConfigForm } from "./config-form";

interface ConfigCardProps {
  config: {
    id: string;
    name: string;
    version: number;
    isActive: boolean;
    promptTemplate: string | null;
    modelConfig: Record<string, unknown> | null;
    autoPublishThresholds: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date;
  };
}

export function ConfigCard({ config }: ConfigCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditing, setIsEditing] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mc = config.modelConfig || {};
  const apt = config.autoPublishThresholds || {};

  function handleActivate() {
    setError(null);
    startTransition(async () => {
      const result = config.isActive
        ? await deactivateConfig(config.id)
        : await activateConfig(config.id);
      if (!result.success) {
        setError(result.error || "Failed");
      }
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteConfig(config.id);
      if (!result.success) {
        setError(result.error || "Failed to delete");
        setShowDelete(false);
      } else {
        router.refresh();
      }
    });
  }

  if (isEditing) {
    return (
      <div className="rounded-lg border p-5">
        <ConfigForm config={config} onCancel={() => setIsEditing(false)} />
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-5 transition-colors ${
        config.isActive ? "border-primary/50 bg-primary/5" : ""
      }`}
    >
      {error && (
        <div className="mb-3 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold">{config.name}</h3>
          <Badge variant="outline" className="font-mono text-xs">
            v{config.version}
          </Badge>
          {config.isActive && <Badge>Active</Badge>}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            variant={config.isActive ? "outline" : "default"}
            size="sm"
            onClick={handleActivate}
            disabled={isPending}
            className="cursor-pointer"
          >
            {isPending ? "..." : config.isActive ? "Deactivate" : "Activate"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={isPending}
            className="cursor-pointer"
          >
            Edit
          </Button>
          {!config.isActive && (
            <>
              {showDelete ? (
                <div className="flex gap-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    disabled={isPending}
                    className="cursor-pointer"
                  >
                    {isPending ? "..." : "Confirm"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDelete(false)}
                    disabled={isPending}
                    className="cursor-pointer"
                  >
                    No
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDelete(true)}
                  disabled={isPending}
                  className="cursor-pointer text-destructive hover:text-destructive"
                >
                  Delete
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Config details */}
      <div className="grid gap-4 sm:grid-cols-2 text-sm">
        {/* Model config */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Model Configuration</p>
          {Object.keys(mc).length > 0 ? (
            <div className="space-y-0.5">
              {mc.primaryModel ? (
                <p>
                  Primary:{" "}
                  <span className="font-mono text-xs">{String(mc.primaryModel)}</span>
                </p>
              ) : null}
              {mc.secondaryModel ? (
                <p>
                  Secondary:{" "}
                  <span className="font-mono text-xs">{String(mc.secondaryModel)}</span>
                </p>
              ) : null}
              {mc.temperature != null && (
                <p>
                  Temperature:{" "}
                  <span className="font-mono text-xs">{String(mc.temperature)}</span>
                </p>
              )}
              {mc.maxTokens != null && (
                <p>
                  Max Tokens:{" "}
                  <span className="font-mono text-xs">{String(mc.maxTokens)}</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">Not configured</p>
          )}
        </div>

        {/* Auto-publish thresholds */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Auto-Publish Thresholds
          </p>
          {Object.keys(apt).length > 0 ? (
            <div className="space-y-0.5">
              {apt.autoPublishMinConfidence != null && (
                <p>
                  Auto-publish:{" "}
                  <span className="font-mono text-xs">
                    {((apt.autoPublishMinConfidence as number) * 100).toFixed(0)}%
                  </span>
                </p>
              )}
              {apt.reviewMinConfidence != null && (
                <p>
                  Review queue:{" "}
                  <span className="font-mono text-xs">
                    {((apt.reviewMinConfidence as number) * 100).toFixed(0)}%
                  </span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">Not configured</p>
          )}
        </div>
      </div>

      {/* Prompt template preview */}
      {config.promptTemplate && (
        <div className="mt-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Prompt Template</p>
          <pre className="rounded bg-muted p-3 text-xs font-mono overflow-x-auto max-h-24 overflow-y-auto whitespace-pre-wrap">
            {config.promptTemplate.length > 300
              ? config.promptTemplate.substring(0, 300) + "..."
              : config.promptTemplate}
          </pre>
        </div>
      )}

      {/* Timestamps */}
      <div className="mt-3 flex gap-4 text-[11px] text-muted-foreground">
        <span>Created: {config.createdAt.toLocaleDateString()}</span>
        <span>Updated: {config.updatedAt.toLocaleDateString()}</span>
      </div>
    </div>
  );
}
