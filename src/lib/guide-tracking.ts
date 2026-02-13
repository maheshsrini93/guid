"use client";

import { track } from "@vercel/analytics";

/**
 * Guide engagement tracking via Vercel Analytics custom events.
 *
 * Events tracked:
 * - guide_view: User opens a guide
 * - guide_step_view: User views a specific step
 * - guide_complete: User reaches the completion screen
 * - guide_step_time: Time spent on a step (sent when leaving a step)
 * - guide_drop_off: User leaves the guide before completing it
 * - guide_rating: User rates the guide on the completion screen
 */

export interface GuideTrackingContext {
  guideId: string;
  articleNumber: string;
  totalSteps: number;
}

/** Track when a user opens a guide */
export function trackGuideView(ctx: GuideTrackingContext) {
  track("guide_view", {
    guideId: ctx.guideId,
    articleNumber: ctx.articleNumber,
    totalSteps: ctx.totalSteps,
  });
}

/** Track when a user views a specific step */
export function trackStepView(
  ctx: GuideTrackingContext,
  stepNumber: number
) {
  track("guide_step_view", {
    guideId: ctx.guideId,
    articleNumber: ctx.articleNumber,
    stepNumber,
    totalSteps: ctx.totalSteps,
    progressPercent: Math.round((stepNumber / ctx.totalSteps) * 100),
  });
}

/** Track time spent on a step (sent when user moves to the next step) */
export function trackStepTime(
  ctx: GuideTrackingContext,
  stepNumber: number,
  durationMs: number
) {
  // Only track if the user spent a meaningful amount of time (> 1s)
  if (durationMs < 1000) return;

  track("guide_step_time", {
    guideId: ctx.guideId,
    articleNumber: ctx.articleNumber,
    stepNumber,
    durationSeconds: Math.round(durationMs / 1000),
  });
}

/** Track when a user completes the guide */
export function trackGuideComplete(ctx: GuideTrackingContext) {
  track("guide_complete", {
    guideId: ctx.guideId,
    articleNumber: ctx.articleNumber,
    totalSteps: ctx.totalSteps,
  });
}

/** Track when a user leaves the guide before completing */
export function trackGuideDropOff(
  ctx: GuideTrackingContext,
  lastStepViewed: number
) {
  track("guide_drop_off", {
    guideId: ctx.guideId,
    articleNumber: ctx.articleNumber,
    lastStepViewed,
    totalSteps: ctx.totalSteps,
    completionPercent: Math.round(
      (lastStepViewed / ctx.totalSteps) * 100
    ),
  });
}

/** Track when a user rates the guide */
export function trackGuideRating(
  ctx: GuideTrackingContext,
  rating: number
) {
  track("guide_rating", {
    guideId: ctx.guideId,
    articleNumber: ctx.articleNumber,
    rating,
  });
}
