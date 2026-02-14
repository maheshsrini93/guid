"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  X,
  Zap,
  MessageSquare,
  Video,
  WifiOff,
  BanIcon,
  Camera,
  BookOpen,
  Users,
  Crown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BillingInterval = "monthly" | "annual";

const PRICES = {
  monthly: { amount: 9.99, label: "$9.99/mo" },
  annual: { amount: 99, label: "$99/yr", perMonth: "$8.25/mo" },
} as const;

interface Feature {
  name: string;
  free: boolean | string;
  premium: boolean | string;
  icon: React.ComponentType<{ className?: string }>;
}

const FEATURES: Feature[] = [
  {
    name: "Step-by-step assembly guides",
    free: true,
    premium: true,
    icon: BookOpen,
  },
  {
    name: "Community access",
    free: true,
    premium: true,
    icon: Users,
  },
  {
    name: "AI troubleshooting chats",
    free: "3/month",
    premium: "Unlimited",
    icon: MessageSquare,
  },
  {
    name: "Photo diagnosis",
    free: false,
    premium: true,
    icon: Camera,
  },
  {
    name: "Video guides",
    free: false,
    premium: true,
    icon: Video,
  },
  {
    name: "Offline access",
    free: false,
    premium: true,
    icon: WifiOff,
  },
  {
    name: "Ad-free experience",
    free: false,
    premium: true,
    icon: BanIcon,
  },
  {
    name: "Priority AI responses",
    free: false,
    premium: true,
    icon: Zap,
  },
];

function BillingToggle({
  interval,
  onChange,
}: {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-muted p-1">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={cn(
          "cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          interval === "monthly"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={interval === "monthly"}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={cn(
          "cursor-pointer rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          interval === "annual"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-pressed={interval === "annual"}
      >
        Annual
        <Badge className="ml-2 text-[10px]" variant="default">
          Save 17%
        </Badge>
      </button>
    </div>
  );
}

function FeatureRow({ feature }: { feature: Feature }) {
  const Icon = feature.icon;
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border px-2 py-3 last:border-b-0 sm:grid-cols-[1fr_120px_120px] sm:px-4">
      <div className="flex items-center gap-3">
        <Icon
          className="h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden="true"
        />
        <span className="text-sm">{feature.name}</span>
      </div>
      <div className="flex justify-center">
        <FeatureValue value={feature.free} />
      </div>
      <div className="flex justify-center">
        <FeatureValue value={feature.premium} isPremium />
      </div>
    </div>
  );
}

function FeatureValue({
  value,
  isPremium = false,
}: {
  value: boolean | string;
  isPremium?: boolean;
}) {
  if (typeof value === "string") {
    return (
      <span
        className={cn(
          "text-xs font-medium sm:text-sm",
          isPremium ? "text-primary" : "text-muted-foreground"
        )}
      >
        {value}
      </span>
    );
  }
  if (value) {
    return (
      <Check
        className={cn(
          "h-5 w-5",
          isPremium ? "text-primary" : "text-green-600 dark:text-green-500"
        )}
        aria-label="Included"
      />
    );
  }
  return (
    <X
      className="h-5 w-5 text-muted-foreground/40"
      aria-label="Not included"
    />
  );
}

function PlanCard({
  title,
  description,
  price,
  priceSubtext,
  features,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  ctaLoading = false,
  ctaVariant = "default",
  highlighted = false,
}: {
  title: string;
  description: string;
  price: string;
  priceSubtext?: string;
  features: string[];
  ctaLabel: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  ctaLoading?: boolean;
  ctaVariant?: "default" | "outline";
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-xl border p-6 sm:p-8",
        highlighted
          ? "border-primary bg-card shadow-lg dark:shadow-primary/5"
          : "border-border bg-card shadow-sm"
      )}
    >
      {highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Crown className="h-3 w-3" aria-hidden="true" />
          Most Popular
        </Badge>
      )}
      <div className="mb-6">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="mb-6">
        <span className="font-mono text-4xl font-bold tracking-tight">
          {price}
        </span>
        {priceSubtext && (
          <span className="ml-2 text-sm text-muted-foreground">
            {priceSubtext}
          </span>
        )}
      </div>
      {ctaHref ? (
        <Button
          asChild
          size="lg"
          variant={ctaVariant}
          className="mb-6 w-full"
        >
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      ) : (
        <Button
          size="lg"
          variant={ctaVariant}
          className="mb-6 w-full cursor-pointer"
          onClick={ctaOnClick}
          disabled={ctaLoading}
        >
          {ctaLoading ? (
            <>
              <Loader2
                className="mr-2 h-4 w-4 motion-safe:animate-spin"
                aria-hidden="true"
              />
              Redirecting...
            </>
          ) : (
            ctaLabel
          )}
        </Button>
      )}
      <ul className="flex flex-col gap-3" role="list">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PricingContent() {
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const premiumPrice =
    interval === "monthly"
      ? PRICES.monthly.label
      : PRICES.annual.label;

  const premiumPriceSubtext =
    interval === "annual" ? `(${PRICES.annual.perMonth})` : undefined;

  async function handleCheckout() {
    setError(null);
    setCheckoutLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval }),
      });

      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent("/pricing")}`);
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-16 sm:py-24">
      {/* Header */}
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Get more out of Guid with Premium. Unlimited chats, video guides,
          offline access, and more.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="mt-10 flex justify-center">
        <BillingToggle interval={interval} onChange={setInterval} />
      </div>

      {/* Error message */}
      {error && (
        <div
          className="mx-auto mt-4 max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-center text-sm text-destructive dark:bg-destructive/20"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Plan Cards */}
      <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
        <PlanCard
          title="Free"
          description="Everything you need to get started"
          price="$0"
          priceSubtext="forever"
          ctaLabel="Get Started"
          ctaHref="/register"
          ctaVariant="outline"
          features={[
            "Step-by-step assembly guides",
            "Community access",
            "3 AI troubleshooting chats/month",
            "Basic search and browsing",
          ]}
        />
        <PlanCard
          title="Premium"
          description="For power users who want it all"
          price={premiumPrice}
          priceSubtext={premiumPriceSubtext}
          ctaLabel="Upgrade to Premium"
          ctaOnClick={handleCheckout}
          ctaLoading={checkoutLoading}
          highlighted
          features={[
            "Everything in Free",
            "Unlimited AI troubleshooting chats",
            "Photo diagnosis for issues",
            "Video guides from creators",
            "Offline guide access",
            "Ad-free experience",
            "Priority AI responses",
          ]}
        />
      </div>

      {/* Feature Comparison Table */}
      <div className="mx-auto mt-20 max-w-3xl">
        <h2 className="mb-8 text-center text-2xl font-bold">
          Feature comparison
        </h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-border bg-muted/50 px-2 py-3 sm:grid-cols-[1fr_120px_120px] sm:px-4">
            <span className="text-sm font-semibold">Feature</span>
            <span className="text-center text-xs font-semibold sm:text-sm">
              Free
            </span>
            <span className="text-center text-xs font-semibold text-primary sm:text-sm">
              Premium
            </span>
          </div>
          {/* Feature rows */}
          {FEATURES.map((feature) => (
            <FeatureRow key={feature.name} feature={feature} />
          ))}
        </div>
      </div>

      {/* FAQ-style bottom section */}
      <div className="mx-auto mt-20 max-w-2xl text-center">
        <h2 className="text-2xl font-bold">Questions?</h2>
        <p className="mt-4 text-muted-foreground">
          Free plans include full access to all assembly guides and community
          features. Premium unlocks unlimited AI chats, video content, and
          offline access. You can upgrade, downgrade, or cancel anytime.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button asChild variant="outline">
            <Link href="/products">Browse Guides</Link>
          </Button>
          <Button asChild>
            <Link href="/chat">Try AI Chat Free</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
