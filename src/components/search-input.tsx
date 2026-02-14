"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Clock, ExternalLink, Loader2, Plus } from "lucide-react";
import {
  trackSearchQuery,
  trackSearchAutocomplete,
  trackSearchDiscovery,
} from "@/lib/search-tracking";
import { isValidImageUrl } from "@/lib/image-utils";
import { BarcodeScanner } from "@/components/barcode-scanner";
import { OcrCapture } from "@/components/ocr-capture";

interface SearchResult {
  articleNumber: string;
  name: string | null;
  type: string | null;
  price: number | null;
  imageUrl: string | null;
}

interface SearchResponse {
  results: SearchResult[];
  detectedType?: "article_number" | "url" | "text";
  extractedArticleNumber?: string;
  detectedRetailer?: string;
  notFound?: boolean;
}

const RETAILER_DISPLAY_NAMES: Record<string, string> = {
  ikea: "IKEA",
  amazon: "Amazon",
  wayfair: "Wayfair",
  homedepot: "Home Depot",
  target: "Target",
};

const RECENT_SEARCHES_KEY = "guid-recent-searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const recent = getRecentSearches().filter((s) => s !== query);
    recent.unshift(query);
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT))
    );
  } catch {
    // localStorage may be unavailable
  }
}

export function SearchInput() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [extractedArticle, setExtractedArticle] = useState<string | null>(null);
  const [detectedRetailer, setDetectedRetailer] = useState<string | null>(null);
  const [urlNotFound, setUrlNotFound] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [queuePending, startQueueTransition] = useTransition();
  const [queueMessage, setQueueMessage] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load recent searches on focus
  const handleFocus = useCallback(() => {
    setRecentSearches(getRecentSearches());
    setShowDropdown(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced autocomplete fetch
  useEffect(() => {
    if (!value || value.length < 2) {
      setResults([]);
      setDetectedType(null);
      setExtractedArticle(null);
      setDetectedRetailer(null);
      setUrlNotFound(false);
      setQueueMessage(null);
      return;
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(value)}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data: SearchResponse = await res.json();
          setResults(data.results);
          setDetectedType(data.detectedType ?? null);
          setExtractedArticle(data.extractedArticleNumber ?? null);
          setDetectedRetailer(data.detectedRetailer ?? null);
          setUrlNotFound(data.notFound ?? false);
          setQueueMessage(null);
          setShowDropdown(true);
        }
      } catch {
        // aborted or network error
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [value]);

  // Handle barcode scan result
  const handleBarcodeScan = useCallback(
    (code: string) => {
      setValue(code);
      saveRecentSearch(code);
      trackSearchDiscovery("barcode");
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", code);
      params.delete("page");
      router.push(`/products?${params.toString()}`);
      setShowDropdown(false);
    },
    [router, searchParams]
  );

  // Handle OCR result
  const handleOcrResult = useCallback(
    (text: string) => {
      setValue(text);
      saveRecentSearch(text);
      trackSearchDiscovery("ocr");
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", text);
      params.delete("page");
      router.push(`/products?${params.toString()}`);
      setShowDropdown(false);
    },
    [router, searchParams]
  );

  // Navigate on search submit
  const handleSearch = useCallback(
    (query: string, discoveryMethod?: "text" | "article_number" | "url" | "recent") => {
      if (!query.trim()) return;
      saveRecentSearch(query.trim());
      trackSearchQuery(query.trim(), results.length, detectedType);
      if (discoveryMethod) {
        trackSearchDiscovery(discoveryMethod);
      }
      const params = new URLSearchParams(searchParams.toString());
      params.set("q", query.trim());
      params.delete("page");
      router.push(`/products?${params.toString()}`);
      setShowDropdown(false);
    },
    [router, searchParams, results.length, detectedType]
  );

  // Navigate directly to a product
  const handleSelectProduct = useCallback(
    (articleNumber: string, resultPosition?: number) => {
      saveRecentSearch(value.trim());
      trackSearchAutocomplete(
        value.trim(),
        articleNumber,
        resultPosition ?? 0,
        detectedType
      );
      if (detectedType === "url") {
        trackSearchDiscovery("url");
      } else if (detectedType === "article_number") {
        trackSearchDiscovery("article_number");
      } else {
        trackSearchDiscovery("text");
      }
      setShowDropdown(false);
      router.push(`/products/${articleNumber}`);
    },
    [router, value, detectedType]
  );

  // Queue scrape for unrecognized URL product
  const handleQueueScrape = useCallback(() => {
    if (!extractedArticle) return;
    startQueueTransition(async () => {
      try {
        const { manualProductScrape } = await import("@/lib/actions/catalog-sync");
        const result = await manualProductScrape(extractedArticle);
        if (result.success) {
          setQueueMessage(result.message ?? "Product queued for import.");
        } else {
          setQueueMessage(result.error ?? "Failed to queue product.");
        }
      } catch {
        setQueueMessage("Failed to queue product. Please try again.");
      }
    });
  }, [extractedArticle]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        // URL detection: redirect directly
        if (detectedType === "url" && results.length > 0) {
          handleSelectProduct(results[0].articleNumber, 0);
        } else {
          const method = detectedType === "article_number" ? "article_number" : "text";
          handleSearch(value, method);
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    },
    [value, detectedType, results, handleSearch, handleSelectProduct]
  );

  const retailerName = detectedRetailer
    ? RETAILER_DISPLAY_NAMES[detectedRetailer] ?? detectedRetailer
    : null;

  const showRecent =
    showDropdown && !value && recentSearches.length > 0;
  const showResults = showDropdown && value.length >= 2 && results.length > 0;
  const showUrlNotFound = showDropdown && detectedType === "url" && urlNotFound;
  const showNoResults =
    showDropdown && value.length >= 2 && results.length === 0 && !loading && !urlNotFound;

  return (
    <div ref={wrapperRef} className="relative w-full sm:w-96">
      <div className="relative flex items-center gap-1">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products, article numbers, or paste URL..."
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            className="pl-9"
            aria-label="Search products"
            aria-expanded={showDropdown}
            role="combobox"
            aria-autocomplete="list"
          />
        </div>
        <BarcodeScanner onScanResult={handleBarcodeScan} />
        <OcrCapture onOcrResult={handleOcrResult} />
      </div>

      {/* Dropdown */}
      {(showRecent || showResults || showNoResults || showUrlNotFound) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border bg-popover shadow-lg overflow-hidden max-h-[70vh] overflow-y-auto">
          {/* URL detection banner — product found */}
          {detectedType === "url" && extractedArticle && !urlNotFound && (
            <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 dark:bg-primary/15 text-sm">
              <ExternalLink className="h-4 w-4 text-primary" />
              <span>
                Detected {retailerName} product — {extractedArticle}
              </span>
            </div>
          )}

          {/* URL detection banner — product NOT found */}
          {showUrlNotFound && extractedArticle && (
            <div className="px-3 py-3 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4 text-primary" />
                <span>
                  Detected {retailerName} product — {extractedArticle}
                </span>
              </div>
              {queueMessage ? (
                <p className="text-xs text-muted-foreground">{queueMessage}</p>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground flex-1">
                    Product not in our catalog yet.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleQueueScrape}
                    disabled={queuePending}
                    className="cursor-pointer text-xs h-7"
                  >
                    {queuePending ? (
                      <Loader2 className="h-3 w-3 mr-1 motion-safe:animate-spin" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1" />
                    )}
                    Queue import
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Article number detection banner */}
          {detectedType === "article_number" && results.length > 0 && (
            <div className="px-3 py-2 bg-primary/10 dark:bg-primary/15 text-sm">
              Exact article number match
            </div>
          )}

          {/* Recent searches */}
          {showRecent && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                Recent Searches
              </div>
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="flex w-full min-h-[44px] items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent cursor-pointer text-left"
                  onClick={() => {
                    setValue(s);
                    handleSearch(s, "recent");
                  }}
                >
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {s}
                </button>
              ))}
            </>
          )}

          {/* Autocomplete results */}
          {showResults &&
            results.map((r, idx) => (
              <button
                key={r.articleNumber}
                type="button"
                className="flex w-full min-h-[44px] items-center gap-3 px-3 py-2.5 hover:bg-accent cursor-pointer text-left"
                onClick={() => handleSelectProduct(r.articleNumber, idx)}
              >
                {isValidImageUrl(r.imageUrl) ? (
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                    <Image
                      src={r.imageUrl}
                      alt={r.name || "Product"}
                      fill
                      sizes="40px"
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted text-xs text-muted-foreground">
                    ?
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {r.name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {r.articleNumber}
                    {r.price != null && ` — $${r.price.toFixed(2)}`}
                  </p>
                </div>
              </button>
            ))}

          {/* No results */}
          {showNoResults && (
            <div className="px-3 py-4 text-center text-sm text-muted-foreground">
              No products found for &ldquo;{value}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}
