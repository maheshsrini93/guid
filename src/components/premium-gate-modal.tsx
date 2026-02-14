"use client";

import { useCallback } from "react";
import Link from "next/link";
import {
  Crown,
  X,
  MessageSquare,
  Video,
  WifiOff,
  Zap,
  Camera,
  BanIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PremiumFeature {
  icon: LucideIcon;
  name: string;
}

const PREMIUM_FEATURES: Record<string, PremiumFeature> = {
  offline: { icon: WifiOff, name: "Offline Access" },
  video: { icon: Video, name: "Video Guides" },
  chat: { icon: MessageSquare, name: "Unlimited Chats" },
  photo: { icon: Camera, name: "Photo Diagnosis" },
  priority: { icon: Zap, name: "Priority AI" },
  adFree: { icon: BanIcon, name: "Ad-Free Experience" },
};

export type PremiumFeatureKey = keyof typeof PREMIUM_FEATURES;

interface PremiumGateModalProps {
  open: boolean;
  onDismiss: () => void;
  feature: PremiumFeatureKey;
  title?: string;
  description?: string;
}

export function PremiumGateModal({
  open,
  onDismiss,
  feature,
  title,
  description,
}: PremiumGateModalProps) {
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) onDismiss();
    },
    [onDismiss]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    },
    [onDismiss]
  );

  if (!open) return null;

  const featureInfo = PREMIUM_FEATURES[feature];
  const FeatureIcon = featureInfo.icon;

  const modalTitle = title ?? `${featureInfo.name} is a Premium feature`;
  const modalDescription =
    description ??
    `Upgrade to Guid Premium to unlock ${featureInfo.name.toLowerCase()} and all other premium features.`;

  // Show 3 other features as value props (exclude the current one)
  const otherFeatures = Object.entries(PREMIUM_FEATURES)
    .filter(([key]) => key !== feature)
    .slice(0, 3);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="premium-gate-title"
    >
      <div className="relative w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-3 top-3 cursor-pointer text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="text-center">
          <div
            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20"
            aria-hidden="true"
          >
            <FeatureIcon className="h-6 w-6 text-primary" />
          </div>
          <h2
            id="premium-gate-title"
            className="text-lg font-semibold"
          >
            {modalTitle}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {modalDescription}
          </p>
        </div>

        {/* Other premium features */}
        <div className="mt-5 space-y-2.5">
          <p className="text-xs font-medium text-muted-foreground">
            Also included with Premium:
          </p>
          {otherFeatures.map(([key, info]) => {
            const Icon = info.icon;
            return (
              <div key={key} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted"
                  aria-hidden="true"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm">{info.name}</span>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild>
            <Link href="/pricing">
              <Crown className="h-4 w-4" aria-hidden="true" />
              Upgrade to Premium
            </Link>
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={onDismiss}
          >
            Maybe later
          </Button>
        </div>
      </div>
    </div>
  );
}
