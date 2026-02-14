'use client';

import { useState, useEffect, useCallback } from 'react';
import { Download, CheckCircle, Loader2, WifiOff, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PremiumGateModal } from '@/components/premium-gate-modal';
import {
  isGuideSavedOffline,
  saveGuideOffline,
  removeGuideOffline,
} from '@/lib/offline-guides';

interface OfflineGuideButtonProps {
  articleNumber: string;
  productName: string;
  imageUrls: string[];
  isPremium: boolean;
}

export function OfflineGuideButton({
  articleNumber,
  productName,
  imageUrls,
  isPremium,
}: OfflineGuideButtonProps) {
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRemove, setShowRemove] = useState(false);
  const [showGateModal, setShowGateModal] = useState(false);

  useEffect(() => {
    setIsSaved(isGuideSavedOffline(articleNumber));
  }, [articleNumber]);

  const handleSave = useCallback(async () => {
    if (!isPremium) {
      setShowGateModal(true);
      return;
    }
    setIsLoading(true);
    try {
      const pageUrl = `/products/${articleNumber}`;
      const success = await saveGuideOffline(
        articleNumber,
        productName,
        pageUrl,
        imageUrls
      );
      if (success) {
        setIsSaved(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [articleNumber, productName, imageUrls, isPremium]);

  const handleRemove = useCallback(async () => {
    await removeGuideOffline(articleNumber);
    setIsSaved(false);
    setShowRemove(false);
  }, [articleNumber]);

  // Service worker not supported
  if (typeof navigator !== 'undefined' && !('serviceWorker' in navigator)) {
    return null;
  }

  if (isSaved) {
    return (
      <div
        className="relative"
        onMouseEnter={() => setShowRemove(true)}
        onMouseLeave={() => setShowRemove(false)}
      >
        {showRemove ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            className="text-destructive border-destructive/30 hover:bg-destructive/5 dark:hover:bg-destructive/10"
            aria-label={`Remove offline copy of ${productName}`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Remove Offline
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 border-green-600/30 dark:text-green-400 dark:border-green-400/30"
            aria-label={`${productName} is available offline`}
          >
            <WifiOff className="h-4 w-4" aria-hidden="true" />
            Available Offline
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleSave}
        disabled={isLoading}
        aria-busy={isLoading}
        aria-label={`Save ${productName} for offline access`}
      >
        {isLoading ? (
          <>
            <Loader2
              className="h-4 w-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
            Saving...
          </>
        ) : (
          <>
            <Download className="h-4 w-4" aria-hidden="true" />
            Save Offline
          </>
        )}
      </Button>
      <PremiumGateModal
        open={showGateModal}
        onDismiss={() => setShowGateModal(false)}
        feature="offline"
      />
    </>
  );
}

/** Small badge shown on product cards for offline-cached guides. */
export function OfflineAvailableBadge({
  articleNumber,
}: {
  articleNumber: string;
}) {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    setIsSaved(isGuideSavedOffline(articleNumber));
  }, [articleNumber]);

  if (!isSaved) return null;

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <CheckCircle className="h-3 w-3" aria-hidden="true" />
      Offline
    </span>
  );
}
