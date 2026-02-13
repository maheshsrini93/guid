import { prisma } from "@/lib/prisma";
import { ConfigCard } from "./config-actions";
import { NewConfigButton } from "./new-config-button";

export default async function AIConfigPage() {
  const configs = await prisma.aIGenerationConfig.findMany({
    orderBy: [{ isActive: "desc" }, { updatedAt: "desc" }],
  });

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">AI Configuration</h1>
          <p className="text-sm text-muted-foreground">
            Manage prompt templates, model settings, and auto-publish thresholds.
            Only one config can be active at a time.
          </p>
        </div>
        <NewConfigButton />
      </div>

      {configs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium text-muted-foreground">No configurations yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first AI generation config to set up prompt templates and model parameters.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {configs.map((config) => (
            <ConfigCard
              key={config.id}
              config={{
                id: config.id,
                name: config.name,
                version: config.version,
                isActive: config.isActive,
                promptTemplate: config.promptTemplate,
                modelConfig: config.modelConfig as Record<string, unknown> | null,
                autoPublishThresholds: config.autoPublishThresholds as Record<string, unknown> | null,
                createdAt: config.createdAt,
                updatedAt: config.updatedAt,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
