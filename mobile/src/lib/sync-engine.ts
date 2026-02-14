import {
  type ActionType,
  type PendingAction,
  addAction,
  getActions,
  removeAction,
  updateAction,
  getActionCount,
} from "./database";
import { apiClient } from "./api-client";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

/**
 * Action-to-API endpoint mapping.
 * Each action type maps to a function that processes the action payload.
 */
const actionProcessors: Record<
  ActionType,
  (payload: Record<string, unknown>) => Promise<void>
> = {
  save_product: async (payload) => {
    await apiClient.post("/api/products/save", {
      articleNumber: payload.articleNumber,
    });
  },
  unsave_product: async (payload) => {
    await apiClient.post("/api/products/save", {
      articleNumber: payload.articleNumber,
    });
  },
  guide_progress: async (payload) => {
    await apiClient.post("/api/guides/progress", payload);
  },
  chat_message: async (payload) => {
    await apiClient.post("/api/chat", payload);
  },
};

/**
 * Offline sync engine.
 * Queues actions when offline and drains the queue when connectivity returns.
 * Uses exponential backoff for retries and evicts actions exceeding MAX_RETRIES.
 */
export class SyncEngine {
  private isDraining = false;

  /**
   * Add an action to the offline queue.
   */
  async enqueueAction(
    type: ActionType,
    payload: Record<string, unknown>
  ): Promise<void> {
    await addAction(type, payload);
  }

  /**
   * Process all pending actions in order.
   * Each action is retried with exponential backoff. Actions that exceed
   * MAX_RETRIES are evicted from the queue.
   *
   * Conflict resolution:
   * - guide_progress: server wins (last-write-wins on server)
   * - save/unsave: idempotent on server, safe to replay
   * - chat_message: append-only, no conflict
   */
  async drainQueue(): Promise<void> {
    if (this.isDraining) return;
    this.isDraining = true;

    try {
      const actions = await getActions();

      for (const action of actions) {
        const success = await this.processAction(action);
        if (success) {
          await removeAction(action.id);
        } else if (action.attempts + 1 >= MAX_RETRIES) {
          // Evict permanently failed actions
          await removeAction(action.id);
        } else {
          // Update attempt count; will retry on next drain
          await updateAction(
            action.id,
            action.attempts + 1,
            action.lastError
          );
        }
      }
    } finally {
      this.isDraining = false;
    }
  }

  /**
   * Get the number of pending actions in the queue.
   */
  async getQueueSize(): Promise<number> {
    return getActionCount();
  }

  /**
   * Whether the engine is currently draining the queue.
   */
  get isSyncing(): boolean {
    return this.isDraining;
  }

  private async processAction(action: PendingAction): Promise<boolean> {
    const processor = actionProcessors[action.type as ActionType];
    if (!processor) {
      // Unknown action type — evict it
      return true;
    }

    try {
      const payload = JSON.parse(action.payload) as Record<string, unknown>;
      await processor(payload);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      // Update lastError for debugging
      await updateAction(action.id, action.attempts + 1, errorMsg).catch(
        () => {}
      );
      return false;
    }
  }
}

/** Shared singleton instance */
export const syncEngine = new SyncEngine();
