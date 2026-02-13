"use server";

import { batchEnqueueJobs, enqueueJob } from "./job-queue";
import type { JobPriority, JobTrigger } from "@prisma/client";

/**
 * Server action: Enqueue a single product for AI generation.
 * Thin wrapper for use in client components.
 */
export async function enqueueProductAction(
  productId: number,
  options?: { priority?: JobPriority; triggeredBy?: JobTrigger }
) {
  return enqueueJob({
    productId,
    priority: options?.priority ?? "normal",
    triggeredBy: options?.triggeredBy ?? "manual",
  });
}

/**
 * Server action: Enqueue multiple products for AI generation.
 * Thin wrapper for use in client components.
 */
export async function enqueueBatchAction(
  productIds: number[],
  options?: { priority?: JobPriority; triggeredBy?: JobTrigger }
) {
  return batchEnqueueJobs({
    productIds,
    priority: options?.priority ?? "normal",
    triggeredBy: options?.triggeredBy ?? "batch",
  });
}
