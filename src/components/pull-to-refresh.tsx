"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

const PULL_THRESHOLD = 80; // px to pull before triggering refresh
const MAX_PULL = 120; // max visual pull distance

/**
 * Pull-to-refresh wrapper for mobile pages.
 * Wraps its children and shows a refresh indicator when pulled down at scroll top.
 * Triggers router.refresh() to revalidate server components.
 */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      // Only activate at the top of the page
      if (window.scrollY > 0 || refreshing) return;
      touchStartY.current = e.touches[0].clientY;
      isPulling.current = true;
    },
    [refreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!isPulling.current || refreshing) return;
      // Double-check we're still at the top
      if (window.scrollY > 0) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      const dy = e.touches[0].clientY - touchStartY.current;
      if (dy > 0) {
        // Apply resistance: diminishing pull distance beyond threshold
        const distance = Math.min(dy * 0.5, MAX_PULL);
        setPullDistance(distance);
        // Prevent default scroll when pulling
        if (distance > 10) {
          e.preventDefault();
        }
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    },
    [refreshing]
  );

  const handleTouchEnd = useCallback(() => {
    if (!isPulling.current) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.5); // Snap to indicator position

      // Trigger Next.js router refresh to revalidate server components
      router.refresh();

      // Reset after a brief delay for visual feedback
      setTimeout(() => {
        setRefreshing(false);
        setPullDistance(0);
      }, 1000);
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, refreshing, router]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Use passive: false for touchmove to allow preventDefault
    container.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd, {
      passive: true,
    });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const showIndicator = pullDistance > 10 || refreshing;
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const rotation = progress * 360;

  return (
    <div
      ref={containerRef}
      className="relative"
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Pull indicator */}
      {showIndicator && (
        <div
          className="pointer-events-none absolute left-0 right-0 z-10 flex items-center justify-center"
          style={{
            top: 0,
            height: `${Math.max(pullDistance, refreshing ? 40 : 0)}px`,
            transition: refreshing ? "height 200ms ease-out" : "none",
          }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10"
            style={{
              opacity: Math.min(progress, 1),
              transform: refreshing
                ? undefined
                : `rotate(${rotation}deg)`,
            }}
          >
            <RefreshCw
              className={`h-4 w-4 text-primary ${
                refreshing ? "animate-spin" : ""
              }`}
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {/* Page content with pull offset */}
      <div
        style={{
          transform:
            pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
          transition:
            !isPulling.current && pullDistance > 0
              ? "transform 200ms ease-out"
              : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
}
