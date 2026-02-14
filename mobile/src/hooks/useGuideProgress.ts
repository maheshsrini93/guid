import { useCallback, useEffect, useRef, useState } from 'react';

import { getProgress, saveProgress } from '../services/guides';

interface UseGuideProgressReturn {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  isLoading: boolean;
}

export function useGuideProgress(articleNumber: string): UseGuideProgressReturn {
  const [currentStep, setCurrentStepState] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const progress = await getProgress(articleNumber);
        if (!cancelled && progress?.currentStep != null) {
          setCurrentStepState(progress.currentStep);
        }
      } catch {
        // No saved progress — start from 0
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [articleNumber]);

  // Save progress with debounce (500ms) to avoid hammering the API on fast swipes
  const setCurrentStep = useCallback(
    (step: number) => {
      setCurrentStepState(step);

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveProgress(articleNumber, step).catch(() => {
          // silent fail — progress is still tracked locally
        });
      }, 500);
    },
    [articleNumber]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return { currentStep, setCurrentStep, isLoading };
}
