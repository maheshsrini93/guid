"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export function SubscribeRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = searchParams.get("interval") || "monthly";
    if (interval !== "monthly" && interval !== "annual") {
      router.replace("/pricing");
      return;
    }

    let cancelled = false;

    async function redirect() {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interval }),
        });

        if (cancelled) return;

        if (res.status === 401) {
          router.replace(
            `/login?callbackUrl=${encodeURIComponent(`/subscribe?interval=${interval}`)}`
          );
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Something went wrong.");
          return;
        }

        if (data.url) {
          window.location.href = data.url;
        }
      } catch {
        if (!cancelled) {
          setError("Unable to connect. Please try again.");
        }
      }
    }

    redirect();

    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <div
          className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive dark:bg-destructive/20"
          role="alert"
        >
          {error}
        </div>
        <button
          type="button"
          onClick={() => router.push("/pricing")}
          className="cursor-pointer text-sm text-primary underline underline-offset-4 hover:text-primary/80 transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Back to pricing
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Loader2
        className="h-8 w-8 text-primary motion-safe:animate-spin"
        aria-hidden="true"
      />
      <p className="text-muted-foreground">
        Redirecting to secure checkout...
      </p>
    </div>
  );
}
