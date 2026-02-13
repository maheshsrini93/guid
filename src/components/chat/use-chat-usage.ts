"use client";

import { useCallback, useEffect, useState } from "react";

interface ChatUsage {
  sessionsUsed: number;
  sessionsLimit: number;
  sessionsRemaining: number;
  canStartChat: boolean;
}

/**
 * Hook to fetch the user's current chat usage from /api/chat/usage.
 * Returns the usage data and a refresh function.
 */
export function useChatUsage() {
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/chat/usage");
      if (response.ok) {
        const data = await response.json();
        setUsage(data);
      }
    } catch {
      // Silently fail — usage display is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { usage, loading, refresh };
}
