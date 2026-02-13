"use client";

import { useEffect, useRef, useCallback } from "react";
import {
  trackGuideView,
  trackStepView,
  trackStepTime,
  trackGuideComplete,
  trackGuideDropOff,
  trackGuideRating,
  type GuideTrackingContext,
} from "./guide-tracking";

interface UseGuideTrackingOptions {
  guideId: string | null | undefined;
  articleNumber: string;
  totalSteps: number;
  activeStepNumber: number;
  isComplete: boolean;
}

/**
 * Hook for automatic guide engagement tracking.
 *
 * Usage in GuideViewer:
 *   const { trackRating } = useGuideTracking({
 *     guideId, articleNumber, totalSteps, activeStepNumber, isComplete
 *   });
 *
 * Automatically tracks:
 * - guide_view on mount
 * - guide_step_view on step change
 * - guide_step_time when leaving a step
 * - guide_complete when isComplete transitions to true
 * - guide_drop_off on unmount if not complete
 *
 * Returns:
 * - trackRating(rating: number) — call when user submits a rating
 */
export function useGuideTracking({
  guideId,
  articleNumber,
  totalSteps,
  activeStepNumber,
  isComplete,
}: UseGuideTrackingOptions) {
  const ctxRef = useRef<GuideTrackingContext | null>(null);
  const stepStartTimeRef = useRef<number>(Date.now());
  const prevStepRef = useRef<number>(activeStepNumber);
  const hasTrackedViewRef = useRef(false);
  const hasTrackedCompleteRef = useRef(false);
  const lastStepViewedRef = useRef<number>(activeStepNumber);

  // Build context (stable when guideId/articleNumber/totalSteps don't change)
  useEffect(() => {
    if (!guideId) {
      ctxRef.current = null;
      return;
    }
    ctxRef.current = { guideId, articleNumber, totalSteps };
  }, [guideId, articleNumber, totalSteps]);

  // Track guide view on mount
  useEffect(() => {
    if (!ctxRef.current || hasTrackedViewRef.current) return;
    hasTrackedViewRef.current = true;
    trackGuideView(ctxRef.current);
    trackStepView(ctxRef.current, activeStepNumber);
    stepStartTimeRef.current = Date.now();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideId]);

  // Track step changes
  useEffect(() => {
    if (!ctxRef.current) return;
    if (activeStepNumber === prevStepRef.current) return;

    // Send time spent on previous step
    const elapsed = Date.now() - stepStartTimeRef.current;
    trackStepTime(ctxRef.current, prevStepRef.current, elapsed);

    // Track new step view
    trackStepView(ctxRef.current, activeStepNumber);

    // Reset timer
    stepStartTimeRef.current = Date.now();
    prevStepRef.current = activeStepNumber;
    lastStepViewedRef.current = activeStepNumber;
  }, [activeStepNumber]);

  // Track completion
  useEffect(() => {
    if (!ctxRef.current || !isComplete || hasTrackedCompleteRef.current) return;
    hasTrackedCompleteRef.current = true;
    trackGuideComplete(ctxRef.current);
  }, [isComplete]);

  // Track drop-off on unmount (if not complete)
  useEffect(() => {
    return () => {
      if (!ctxRef.current || hasTrackedCompleteRef.current) return;
      trackGuideDropOff(ctxRef.current, lastStepViewedRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trackRatingFn = useCallback((rating: number) => {
    if (!ctxRef.current) return;
    trackGuideRating(ctxRef.current, rating);
  }, []);

  return { trackRating: trackRatingFn };
}
