"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Crown,
  CreditCard,
  Calendar,
  ArrowRight,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface BillingContentProps {
  planName: string;
  planDescription: string;
  features: string[];
  isActive: boolean;
  renewsAt: string | null;
}

export function BillingContent({
  planName,
  planDescription,
  features,
  isActive,
  renewsAt,
}: BillingContentProps) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [showSuccess, setShowSuccess] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      setShowSuccess(true);
    }
  }, [sessionId]);

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setPortalLoading(false);
    }
  }

  const renewDate = renewsAt ? new Date(renewsAt) : null;

  return (
    <div className="container mx-auto max-w-lg px-4 py-16 sm:py-24">
      {showSuccess && (
        <div
          className="mb-8 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/50"
          role="status"
        >
          <CheckCircle2
            className="mt-0.5 h-5 w-5 shrink-0 text-green-600 dark:text-green-400"
            aria-hidden="true"
          />
          <div>
            <p className="font-medium text-green-800 dark:text-green-200">
              Welcome to Guid Premium!
            </p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              Your subscription is now active. Enjoy unlimited chats, video
              guides, offline access, and all premium features.
            </p>
          </div>
        </div>
      )}

      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        Billing
      </h1>
      <p className="mt-2 text-muted-foreground">
        Manage your subscription and billing details.
      </p>

      {/* Current Plan Card */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Current Plan</h2>
          <Badge
            variant={isActive ? "default" : "secondary"}
            className="gap-1"
          >
            {isActive && (
              <Crown className="h-3 w-3" aria-hidden="true" />
            )}
            {planName}
          </Badge>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">{planDescription}</p>

        {/* Subscription details for premium users */}
        {isActive && renewDate && (
          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-3 text-sm">
              <CreditCard
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span>Premium subscription active</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar
                className="h-4 w-4 text-muted-foreground"
                aria-hidden="true"
              />
              <span>
                Renews on{" "}
                <span className="font-mono font-medium">
                  {renewDate.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-6">
          {isActive ? (
            <Button
              onClick={handleManageSubscription}
              disabled={portalLoading}
              aria-busy={portalLoading}
              variant="outline"
              className="w-full"
            >
              {portalLoading ? (
                <>
                  <Loader2
                    className="h-4 w-4 motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                  Opening portal...
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Manage Subscription
                </>
              )}
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link href="/pricing">
                <Crown className="h-4 w-4" aria-hidden="true" />
                Upgrade to Premium
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Feature list */}
      <div className="mt-8 rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold">
          {isActive ? "Your Premium Features" : "Included in Your Plan"}
        </h2>
        <ul className="mt-4 flex flex-col gap-2" role="list">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                aria-hidden="true"
              />
              {feature}
            </li>
          ))}
        </ul>
        {!isActive && (
          <p className="mt-4 text-xs text-muted-foreground">
            Want more?{" "}
            <Link
              href="/pricing"
              className="font-medium text-primary transition-colors duration-200 ease-out hover:text-primary/80"
            >
              Compare plans
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
