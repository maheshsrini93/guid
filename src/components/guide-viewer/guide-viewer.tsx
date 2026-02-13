"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { TocSidebar } from "./toc-sidebar";
import { IllustrationPanel } from "./illustration-panel";
import { StepSection } from "./step-section";
import { ProgressBar } from "./progress-bar";
import { Lightbox } from "./lightbox";
import { MobileStepCard } from "./mobile-step-card";
import { MobileTocSheet } from "./mobile-toc-sheet";
import { CompletionScreen } from "./completion-screen";
import { ResumeBanner } from "./resume-banner";
import { BookmarkButton } from "./bookmark-button";
import { useGuideProgress } from "./use-guide-progress";
import { useStepBookmarks } from "./use-step-bookmarks";
import { Badge } from "@/components/ui/badge";
import { List, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useGuideTracking } from "@/lib/use-guide-tracking";
import type { GuideStep, GuideData } from "./types";

interface GuideViewerProps extends GuideData {
  /** Content to render below the illustration panel in the right column (e.g. ProductInfoCard) */
  sidebarExtra?: React.ReactNode;
  /** Guide ID for progress saving (signed-in users) */
  guideId?: string | null;
  /** User ID for progress saving (signed-in users) */
  userId?: string | null;
  /** Article number for step bookmarking links */
  articleNumber?: string | null;
  /** Product name for bookmark display context */
  productName?: string | null;
}

export function GuideViewer({
  title,
  description,
  difficulty,
  timeMinutes,
  tools,
  aiGenerated,
  communityContributed,
  contributorName,
  steps,
  sidebarExtra,
  guideId,
  userId,
  articleNumber,
  productName,
}: GuideViewerProps) {
  // --- State ---
  const [activeStepNumber, setActiveStepNumber] = useState(
    steps.length > 0 ? steps[0].stepNumber : 1
  );
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [lightbox, setLightbox] = useState<{
    url: string;
    alt: string;
  } | null>(null);
  // Mobile: current step index for card navigation
  const [mobileStepIndex, setMobileStepIndex] = useState(0);
  // Track if we're on mobile (< 640px)
  const [isMobile, setIsMobile] = useState(false);
  // Track if we're on tablet (640-1024px)
  const [isTablet, setIsTablet] = useState(false);
  // Tablet TOC sheet
  const [tabletTocOpen, setTabletTocOpen] = useState(false);
  // Touch tracking for swipe
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

  // Step refs for intersection observer
  const stepRefs = useRef<Map<number, HTMLElement>>(new Map());

  // --- Progress saving (P2.2.13) ---
  const {
    savedProgress,
    showResumeBanner,
    saveProgress,
    clearProgress,
    dismissBanner,
  } = useGuideProgress(userId, guideId);

  // --- Step bookmarking (P2.2.14) ---
  const { isBookmarked, toggleBookmark } = useStepBookmarks();

  const renderBookmarkButton = useCallback(
    (step: GuideStep) => {
      if (!guideId || !articleNumber) return null;
      return (
        <BookmarkButton
          stepNumber={step.stepNumber}
          isBookmarked={isBookmarked(guideId, step.stepNumber)}
          onToggle={() =>
            toggleBookmark({
              guideId,
              stepNumber: step.stepNumber,
              stepTitle: step.title,
              guideTitle: title,
              articleNumber,
              productName: productName || "Product",
            })
          }
        />
      );
    },
    [guideId, articleNumber, productName, title, isBookmarked, toggleBookmark]
  );

  // --- Responsive detection ---
  useEffect(() => {
    const checkSize = () => {
      const w = window.innerWidth;
      setIsMobile(w < 640);
      setIsTablet(w >= 640 && w < 1024);
    };
    checkSize();
    window.addEventListener("resize", checkSize);
    return () => window.removeEventListener("resize", checkSize);
  }, []);

  // --- Auto-save progress on step changes (P2.2.13) ---
  useEffect(() => {
    saveProgress(activeStepNumber, mobileStepIndex);
  }, [activeStepNumber, mobileStepIndex, saveProgress]);

  // --- Resume handler: scroll to saved step ---
  const handleResume = useCallback(() => {
    if (!savedProgress) return;

    if (isMobile) {
      const targetIdx = savedProgress.mobileStepIndex;
      if (targetIdx >= 0 && targetIdx < steps.length) {
        setMobileStepIndex(targetIdx);
      }
    } else {
      const targetStep = steps.find(
        (s) => s.stepNumber === savedProgress.stepNumber
      );
      if (targetStep) {
        document
          .getElementById(`step-${targetStep.stepNumber}`)
          ?.scrollIntoView({ behavior: "smooth" });
      }
    }
    // Mark steps before the saved step as completed
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      for (const s of steps) {
        if (s.stepNumber < savedProgress.stepNumber) {
          next.add(s.stepNumber);
        }
      }
      return next;
    });
    dismissBanner();
  }, [savedProgress, isMobile, steps, dismissBanner]);

  // --- Start Over handler ---
  const handleStartOver = useCallback(() => {
    clearProgress();
    if (isMobile) {
      setMobileStepIndex(0);
    } else {
      document
        .getElementById(`step-${steps[0]?.stepNumber}`)
        ?.scrollIntoView({ behavior: "smooth" });
    }
    setCompletedSteps(new Set());
  }, [clearProgress, isMobile, steps]);

  // --- Scrollspy (desktop/tablet) via Intersection Observer ---
  useEffect(() => {
    if (isMobile || steps.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the most visible step
        let bestEntry: IntersectionObserverEntry | null = null;
        for (const entry of entries) {
          if (
            entry.isIntersecting &&
            (!bestEntry ||
              entry.intersectionRatio > bestEntry.intersectionRatio)
          ) {
            bestEntry = entry;
          }
        }
        if (bestEntry) {
          const stepNum = Number(
            bestEntry.target.getAttribute("data-step-number")
          );
          if (!isNaN(stepNum)) {
            setActiveStepNumber(stepNum);
            // Mark previous steps as completed
            setCompletedSteps((prev) => {
              const next = new Set(prev);
              for (const s of steps) {
                if (s.stepNumber < stepNum) {
                  next.add(s.stepNumber);
                }
              }
              return next;
            });
          }
        }
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    // Observe all step sections
    for (const [, el] of stepRefs.current) {
      observer.observe(el);
    }

    return () => observer.disconnect();
  }, [isMobile, steps]);

  // --- Keyboard navigation (P2.2.15) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (isMobile) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          setMobileStepIndex((i) => Math.min(i + 1, steps.length - 1));
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          setMobileStepIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Home") {
          e.preventDefault();
          setMobileStepIndex(0);
        } else if (e.key === "End") {
          e.preventDefault();
          setMobileStepIndex(steps.length - 1);
        }
      } else {
        // Desktop: arrow keys scroll to prev/next step
        const currentIdx = steps.findIndex(
          (s) => s.stepNumber === activeStepNumber
        );
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          const nextIdx = Math.min(currentIdx + 1, steps.length - 1);
          const nextStep = steps[nextIdx];
          document
            .getElementById(`step-${nextStep.stepNumber}`)
            ?.scrollIntoView({ behavior: "smooth" });
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          const prevIdx = Math.max(currentIdx - 1, 0);
          const prevStep = steps[prevIdx];
          document
            .getElementById(`step-${prevStep.stepNumber}`)
            ?.scrollIntoView({ behavior: "smooth" });
        } else if (e.key === "Home") {
          e.preventDefault();
          document
            .getElementById(`step-${steps[0].stepNumber}`)
            ?.scrollIntoView({ behavior: "smooth" });
        } else if (e.key === "End") {
          e.preventDefault();
          document
            .getElementById(`step-${steps[steps.length - 1].stepNumber}`)
            ?.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, activeStepNumber, steps]);

  // --- Mobile swipe (P2.2.10) ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX.current;
      const dy = e.changedTouches[0].clientY - touchStartY.current;
      // Only trigger if horizontal swipe is dominant and > 50px
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) {
          // Swipe left -> next
          setMobileStepIndex((i) => Math.min(i + 1, steps.length - 1));
        } else {
          // Swipe right -> previous
          setMobileStepIndex((i) => Math.max(i - 1, 0));
        }
        // Haptic feedback
        try {
          navigator.vibrate?.(10);
        } catch {
          // Not supported
        }
      }
    },
    [steps.length]
  );

  // --- Mobile step select from TOC ---
  const handleMobileTocSelect = useCallback(
    (stepNumber: number) => {
      const idx = steps.findIndex((s) => s.stepNumber === stepNumber);
      if (idx >= 0) setMobileStepIndex(idx);
    },
    [steps]
  );

  // --- Progress calculation ---
  const progressPercent = useMemo(() => {
    if (steps.length === 0) return 0;
    if (isMobile) {
      return ((mobileStepIndex + 1) / steps.length) * 100;
    }
    const currentIdx = steps.findIndex(
      (s) => s.stepNumber === activeStepNumber
    );
    return ((currentIdx + 1) / steps.length) * 100;
  }, [isMobile, mobileStepIndex, activeStepNumber, steps]);

  // Check if at the end
  const isComplete = isMobile
    ? mobileStepIndex === steps.length - 1
    : activeStepNumber === steps[steps.length - 1]?.stepNumber;

  // --- Engagement tracking (P0.3.2) ---
  useGuideTracking({
    guideId: guideId ?? null,
    articleNumber: articleNumber ?? "",
    totalSteps: steps.length,
    activeStepNumber: isMobile
      ? steps[mobileStepIndex]?.stepNumber ?? 1
      : activeStepNumber,
    isComplete,
  });

  // --- Lightbox handler ---
  const openLightbox = useCallback((url: string, alt: string) => {
    setLightbox({ url, alt });
  }, []);

  // --- Ref callback for step sections ---
  const setStepRef = useCallback(
    (stepNumber: number) => (el: HTMLElement | null) => {
      if (el) {
        el.setAttribute("data-step-number", String(stepNumber));
        stepRefs.current.set(stepNumber, el);
      } else {
        stepRefs.current.delete(stepNumber);
      }
    },
    []
  );

  // --- Empty state ---
  if (steps.length === 0) {
    return (
      <div className="rounded-lg border p-6">
        <h2>{title}</h2>
        <p className="text-sm text-muted-foreground mt-2">
          Assembly guide coming soon.
        </p>
      </div>
    );
  }

  // ============================
  // MOBILE LAYOUT (< 640px)
  // ============================
  if (isMobile) {
    const currentStep = steps[mobileStepIndex];
    const mobileCompletedSteps = new Set(
      steps.filter((_, i) => i < mobileStepIndex).map((s) => s.stepNumber)
    );

    return (
      <div
        className="flex h-[calc(100vh-3.5rem)] flex-col"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Resume banner (P2.2.13) */}
        {showResumeBanner && savedProgress && (
          <div className="px-4 pt-2">
            <ResumeBanner
              stepNumber={savedProgress.stepNumber}
              onResume={handleResume}
              onStartOver={handleStartOver}
            />
          </div>
        )}

        {(aiGenerated || communityContributed) && mobileStepIndex === 0 && (
          <div className="px-4 pt-1 flex flex-wrap items-center gap-2">
            {communityContributed && (
              <div>
                <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300 text-[10px]">
                  <Users className="h-3 w-3 mr-1" />
                  Community Contributed
                </Badge>
                {contributorName && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Contributed by {contributorName}
                  </p>
                )}
              </div>
            )}
            {aiGenerated && (
              <Badge variant="outline" className="border-blue-300 text-blue-600 dark:border-blue-600 dark:text-blue-400 text-[10px]">
                AI-Generated Guide
              </Badge>
            )}
          </div>
        )}

        <MobileStepCard
          step={currentStep}
          totalSteps={steps.length}
          currentIndex={mobileStepIndex}
          onPrevious={() =>
            setMobileStepIndex((i) => Math.max(i - 1, 0))
          }
          onNext={() =>
            setMobileStepIndex((i) =>
              Math.min(i + 1, steps.length - 1)
            )
          }
          onImageClick={openLightbox}
          bookmarkAction={renderBookmarkButton(currentStep)}
        />

        {/* Mobile TOC floating button + sheet */}
        <MobileTocSheet
          steps={steps}
          activeStepNumber={currentStep.stepNumber}
          completedSteps={mobileCompletedSteps}
          onStepSelect={handleMobileTocSelect}
        />

        {/* Lightbox */}
        {lightbox && (
          <Lightbox
            imageUrl={lightbox.url}
            alt={lightbox.alt}
            onClose={() => setLightbox(null)}
          />
        )}
      </div>
    );
  }

  // ============================
  // TABLET LAYOUT (640–1024px) — P2.2.8
  // ============================
  if (isTablet) {
    return (
      <div>
        {/* Progress bar at top */}
        <ProgressBar percent={progressPercent} />

        {/* Resume banner (P2.2.13) */}
        {showResumeBanner && savedProgress && (
          <div className="px-4 pt-4">
            <ResumeBanner
              stepNumber={savedProgress.stepNumber}
              onResume={handleResume}
              onStartOver={handleStartOver}
            />
          </div>
        )}

        {/* Guide header */}
        <div className="px-4 py-6">
          <h2>{title}</h2>
          {description && (
            <p className="mt-1 text-body-sm text-muted-foreground">
              {description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {communityContributed && (
              <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300">
                <Users className="h-3 w-3 mr-1" />
                Community Contributed
              </Badge>
            )}
            {aiGenerated && (
              <Badge variant="outline" className="border-blue-300 text-blue-600 dark:border-blue-600 dark:text-blue-400">
                AI-Generated
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {difficulty}
            </Badge>
            {timeMinutes && (
              <Badge variant="secondary">{timeMinutes} min</Badge>
            )}
            {tools && (
              <Badge variant="secondary">Tools: {tools}</Badge>
            )}
          </div>
          {communityContributed && contributorName && (
            <p className="mt-1 text-xs text-muted-foreground">
              Contributed by {contributorName}
            </p>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-[1fr_40%] gap-6 px-4 pb-8">
          {/* Instructions (scrollable) */}
          <div className="space-y-12">
            {steps.map((step) => (
              <StepSection
                key={step.id}
                ref={setStepRef(step.stepNumber)}
                step={step}
                totalSteps={steps.length}
                bookmarkAction={renderBookmarkButton(step)}
              />
            ))}

            {/* Completion */}
            <CompletionScreen
              totalSteps={steps.length}
              guideTitle={title}
            />
          </div>

          {/* Sticky illustration + sidebar extra */}
          <div className="sticky top-20 h-fit space-y-4">
            <IllustrationPanel
              steps={steps}
              activeStepNumber={activeStepNumber}
              onImageClick={openLightbox}
            />
            {sidebarExtra}
          </div>
        </div>

        {/* Tablet TOC button */}
        <Sheet open={tabletTocOpen} onOpenChange={setTabletTocOpen}>
          <SheetTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="fixed bottom-6 left-6 z-[var(--z-sticky)] size-12 rounded-full shadow-lg"
              aria-label="Open table of contents"
            >
              <List className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle>Steps</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <TocSidebar
                steps={steps}
                activeStepNumber={activeStepNumber}
                completedSteps={completedSteps}
                progressPercent={progressPercent}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Lightbox */}
        {lightbox && (
          <Lightbox
            imageUrl={lightbox.url}
            alt={lightbox.alt}
            onClose={() => setLightbox(null)}
          />
        )}
      </div>
    );
  }

  // ============================
  // DESKTOP LAYOUT (>= 1024px) — P2.2.1
  // ============================
  return (
    <div>
      {/* Progress bar at top */}
      <ProgressBar percent={progressPercent} />

      {/* Resume banner (P2.2.13) */}
      {showResumeBanner && savedProgress && (
        <div className="px-6 pt-4">
          <ResumeBanner
            stepNumber={savedProgress.stepNumber}
            onResume={handleResume}
            onStartOver={handleStartOver}
          />
        </div>
      )}

      {/* Guide header */}
      <div className="px-6 py-6">
        <h2>{title}</h2>
        {description && (
          <p className="mt-1 text-body-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {communityContributed && (
            <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-300">
              <Users className="h-3 w-3 mr-1" />
              Community Contributed
            </Badge>
          )}
          {aiGenerated && (
            <Badge variant="outline" className="border-blue-300 text-blue-600 dark:border-blue-600 dark:text-blue-400">
              AI-Generated
            </Badge>
          )}
          {difficulty && (
            <Badge variant="outline" className="capitalize">
              {difficulty}
            </Badge>
          )}
          {timeMinutes && (
            <Badge variant="secondary">{timeMinutes} min</Badge>
          )}
          {tools && (
            <Badge variant="secondary">Tools: {tools}</Badge>
          )}
        </div>
        {communityContributed && contributorName && (
          <p className="mt-1 text-xs text-muted-foreground">
            Contributed by {contributorName}
          </p>
        )}
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-[220px_1fr_380px] gap-6 px-6 pb-8">
        {/* TOC Sidebar (sticky) */}
        <aside className="sticky top-20 h-[calc(100vh-6rem)] overflow-hidden">
          <TocSidebar
            steps={steps}
            activeStepNumber={activeStepNumber}
            completedSteps={completedSteps}
            progressPercent={progressPercent}
          />
        </aside>

        {/* Work Instructions (scrollable, all steps) */}
        <div className="min-w-0 space-y-12">
          {steps.map((step) => (
            <StepSection
              key={step.id}
              ref={setStepRef(step.stepNumber)}
              step={step}
              totalSteps={steps.length}
              bookmarkAction={renderBookmarkButton(step)}
            />
          ))}

          {/* Completion screen at end */}
          <CompletionScreen
            totalSteps={steps.length}
            guideTitle={title}
          />
        </div>

        {/* Illustration Panel (sticky) + sidebar extra */}
        <aside className="sticky top-20 h-fit space-y-4">
          <IllustrationPanel
            steps={steps}
            activeStepNumber={activeStepNumber}
            onImageClick={openLightbox}
          />
          {sidebarExtra}
        </aside>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <Lightbox
          imageUrl={lightbox.url}
          alt={lightbox.alt}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}
