import { useCallback, useEffect, useRef, useState } from "react";
import { syncEngine } from "../lib/sync-engine";
import { initDatabase, type ActionType } from "../lib/database";
import { useNetworkStatus } from "./useNetworkStatus";

interface UseSyncEngineReturn {
  /** Add an action to the offline queue */
  enqueue: (type: ActionType, payload: Record<string, unknown>) => Promise<void>;
  /** Number of pending actions in the queue */
  queueSize: number;
  /** Whether the engine is currently syncing */
  isSyncing: boolean;
}

/**
 * Hook that initializes the sync engine, monitors network status,
 * and auto-drains the queue when connectivity returns.
 */
export function useSyncEngine(): UseSyncEngineReturn {
  const [queueSize, setQueueSize] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { isConnected } = useNetworkStatus();
  const wasConnectedRef = useRef(isConnected);
  const initializedRef = useRef(false);

  const drain = useCallback(async () => {
    setIsSyncing(true);
    try {
      await syncEngine.drainQueue();
    } finally {
      const size = await syncEngine.getQueueSize();
      setQueueSize(size);
      setIsSyncing(false);
    }
  }, []);

  // Initialize database on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    initDatabase().then(async () => {
      const size = await syncEngine.getQueueSize();
      setQueueSize(size);
    });
  }, []);

  // Auto-drain when network comes back
  useEffect(() => {
    const wasOffline = !wasConnectedRef.current;
    wasConnectedRef.current = isConnected;

    if (isConnected && wasOffline) {
      drain();
    }
  }, [isConnected, drain]);

  const enqueue = useCallback(
    async (type: ActionType, payload: Record<string, unknown>) => {
      await syncEngine.enqueueAction(type, payload);
      const size = await syncEngine.getQueueSize();
      setQueueSize(size);

      // If connected, drain immediately
      if (isConnected) {
        drain();
      }
    },
    [isConnected, drain]
  );

  return { enqueue, queueSize, isSyncing };
}
