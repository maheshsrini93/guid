'use client';

import { useState, useCallback } from 'react';
import { Sparkles, Loader2, CheckCircle, Zap, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  requestGuide,
  type RequestGuideResult,
} from '@/lib/actions/request-guide';

interface RequestGuideButtonProps {
  productId: number;
  isPremium: boolean;
}

export function RequestGuideButton({
  productId,
  isPremium,
}: RequestGuideButtonProps) {
  const [state, setState] = useState<RequestGuideResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRequest = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await requestGuide(productId);
      setState(result);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  // Guide was successfully requested
  if (state?.status === 'requested') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4 text-center">
        <CheckCircle
          className="mx-auto h-6 w-6 text-green-600 dark:text-green-400 mb-2"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-green-900 dark:text-green-200">
          Guide requested!
        </p>
        <p className="text-xs text-green-700 dark:text-green-400 mt-1">
          {state.isPriority
            ? 'Your request has been prioritized as a premium member.'
            : 'The guide will be generated and available soon.'}
        </p>
      </div>
    );
  }

  // Already queued or exists
  if (state?.status === 'already_queued') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-center">
        <Loader2
          className="mx-auto h-6 w-6 text-amber-600 dark:text-amber-400 mb-2 motion-safe:animate-spin"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
          Guide is already being generated
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          Check back soon for the completed guide.
        </p>
      </div>
    );
  }

  if (state?.status === 'already_exists') {
    return null;
  }

  // Error state
  if (state && !state.success) {
    return (
      <div className="space-y-3">
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 dark:bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          {state.error}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setState(null)}
        >
          Try again
        </Button>
      </div>
    );
  }

  // Default: request button
  return (
    <div className="space-y-2">
      <Button
        onClick={handleRequest}
        disabled={isLoading}
        aria-busy={isLoading}
        className="w-full sm:w-auto"
      >
        {isLoading ? (
          <>
            <Loader2
              className="h-4 w-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
            Requesting...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Request a Guide
          </>
        )}
      </Button>
      {isPremium && (
        <p className="flex items-center gap-1 text-xs text-primary">
          <Zap className="h-3 w-3" aria-hidden="true" />
          Priority processing as a premium member
        </p>
      )}
    </div>
  );
}
