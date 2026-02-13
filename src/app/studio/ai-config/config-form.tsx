"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createConfig, updateConfig } from "@/lib/actions/ai-config";

interface ConfigFormProps {
  config?: {
    id: string;
    name: string;
    version: number;
    promptTemplate: string | null;
    modelConfig: Record<string, unknown> | null;
    autoPublishThresholds: Record<string, unknown> | null;
  };
  onCancel: () => void;
}

export function ConfigForm({ config, onCancel }: ConfigFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const mc = config?.modelConfig || {};
  const apt = config?.autoPublishThresholds || {};

  const [name, setName] = useState(config?.name || "");
  const [promptTemplate, setPromptTemplate] = useState(config?.promptTemplate || "");
  const [primaryModel, setPrimaryModel] = useState((mc.primaryModel as string) || "");
  const [secondaryModel, setSecondaryModel] = useState((mc.secondaryModel as string) || "");
  const [temperature, setTemperature] = useState(
    mc.temperature != null ? String(mc.temperature) : ""
  );
  const [maxTokens, setMaxTokens] = useState(
    mc.maxTokens != null ? String(mc.maxTokens) : ""
  );
  const [autoPublishMin, setAutoPublishMin] = useState(
    apt.autoPublishMinConfidence != null ? String(apt.autoPublishMinConfidence) : ""
  );
  const [reviewMin, setReviewMin] = useState(
    apt.reviewMinConfidence != null ? String(apt.reviewMinConfidence) : ""
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setError(null);

    const modelConfig: Record<string, unknown> = {};
    if (primaryModel.trim()) modelConfig.primaryModel = primaryModel.trim();
    if (secondaryModel.trim()) modelConfig.secondaryModel = secondaryModel.trim();
    if (temperature.trim()) modelConfig.temperature = parseFloat(temperature);
    if (maxTokens.trim()) modelConfig.maxTokens = parseInt(maxTokens, 10);

    const autoPublishThresholds: Record<string, unknown> = {};
    if (autoPublishMin.trim())
      autoPublishThresholds.autoPublishMinConfidence = parseFloat(autoPublishMin);
    if (reviewMin.trim())
      autoPublishThresholds.reviewMinConfidence = parseFloat(reviewMin);

    startTransition(async () => {
      try {
        if (config) {
          const result = await updateConfig({
            id: config.id,
            name: name.trim(),
            promptTemplate: promptTemplate || undefined,
            modelConfig: Object.keys(modelConfig).length > 0 ? modelConfig as { primaryModel?: string; secondaryModel?: string; temperature?: number; maxTokens?: number } : undefined,
            autoPublishThresholds:
              Object.keys(autoPublishThresholds).length > 0
                ? autoPublishThresholds as { autoPublishMinConfidence?: number; reviewMinConfidence?: number }
                : undefined,
          });
          if (!result.success) {
            setError(result.error || "Failed to update");
            return;
          }
        } else {
          const result = await createConfig({
            name: name.trim(),
            promptTemplate: promptTemplate || undefined,
            modelConfig: Object.keys(modelConfig).length > 0 ? modelConfig as { primaryModel?: string; secondaryModel?: string; temperature?: number; maxTokens?: number } : undefined,
            autoPublishThresholds:
              Object.keys(autoPublishThresholds).length > 0
                ? autoPublishThresholds as { autoPublishMinConfidence?: number; reviewMinConfidence?: number }
                : undefined,
          });
          if (!result.success) {
            setError(result.error || "Failed to create");
            return;
          }
        }
        router.refresh();
        onCancel();
      } catch {
        setError("An unexpected error occurred");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h3 className="text-lg font-semibold">
        {config ? `Edit Config (v${config.version})` : "Create New Config"}
      </h3>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="config-name">Config Name</Label>
        <Input
          id="config-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Production v3, Pilot Experiment A"
          required
        />
      </div>

      {/* Model Configuration */}
      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="text-sm font-medium px-1">Model Configuration</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="primary-model">Primary Model</Label>
            <Input
              id="primary-model"
              value={primaryModel}
              onChange={(e) => setPrimaryModel(e.target.value)}
              placeholder="gemini-2.5-flash"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="secondary-model">Secondary Model (Escalation)</Label>
            <Input
              id="secondary-model"
              value={secondaryModel}
              onChange={(e) => setSecondaryModel(e.target.value)}
              placeholder="gemini-2.5-pro"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              placeholder="0.3"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="max-tokens">Max Tokens</Label>
            <Input
              id="max-tokens"
              type="number"
              min="1"
              max="100000"
              step="1"
              value={maxTokens}
              onChange={(e) => setMaxTokens(e.target.value)}
              placeholder="8192"
            />
          </div>
        </div>
      </fieldset>

      {/* Auto-Publish Thresholds */}
      <fieldset className="space-y-3 rounded-lg border p-4">
        <legend className="text-sm font-medium px-1">Auto-Publish Thresholds</legend>
        <p className="text-xs text-muted-foreground">
          Guides with confidence at or above the auto-publish threshold are published immediately.
          Guides between the review threshold and auto-publish threshold enter the review queue.
          Below the review threshold, guides are held.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="auto-publish-min">Auto-Publish Min Confidence</Label>
            <Input
              id="auto-publish-min"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={autoPublishMin}
              onChange={(e) => setAutoPublishMin(e.target.value)}
              placeholder="0.90"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-min">Review Queue Min Confidence</Label>
            <Input
              id="review-min"
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={reviewMin}
              onChange={(e) => setReviewMin(e.target.value)}
              placeholder="0.70"
            />
          </div>
        </div>
      </fieldset>

      {/* Prompt Template */}
      <div className="space-y-1.5">
        <Label htmlFor="prompt-template">Prompt Template</Label>
        <p className="text-xs text-muted-foreground">
          The system prompt sent to the vision model during guide generation. Use placeholders like
          {" {productName}"}, {"{articleNumber}"}, {"{stepCount}"}.
        </p>
        <textarea
          id="prompt-template"
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          placeholder="You are an expert assembly guide writer..."
          rows={12}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm font-mono shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="cursor-pointer">
          {isPending
            ? config
              ? "Saving..."
              : "Creating..."
            : config
              ? "Save Changes"
              : "Create Config"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isPending}
          className="cursor-pointer"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
