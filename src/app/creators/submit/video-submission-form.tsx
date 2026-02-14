"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Youtube,
  Loader2,
  AlertCircle,
  Search,
  X,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  submitVideo,
  type SubmitVideoResult,
} from "@/lib/actions/creators";
import { extractVideoId } from "@/lib/youtube-utils";
import { isValidImageUrl } from "@/lib/image-utils";

interface ProductResult {
  articleNumber: string;
  name: string | null;
  type: string | null;
  price: number | null;
  imageUrl: string | null;
}

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "sv", label: "Swedish" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
] as const;

const initialState: SubmitVideoResult = { success: false };

async function formAction(
  _prev: SubmitVideoResult,
  formData: FormData
): Promise<SubmitVideoResult> {
  return submitVideo(formData);
}

function ProductSearchPicker({
  selectedProduct,
  onSelect,
  onClear,
}: {
  selectedProduct: { id: number; name: string; articleNumber: string; imageUrl: string | null } | null;
  onSelect: (product: { id: number; name: string; articleNumber: string; imageUrl: string | null }) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ProductResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setShowDropdown(true);
        }
      } catch {
        // aborted or network error
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query]);

  if (selectedProduct) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
        {isValidImageUrl(selectedProduct.imageUrl) ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
            <Image
              src={selectedProduct.imageUrl}
              alt={selectedProduct.name}
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
          <p className="truncate text-sm font-medium">{selectedProduct.name}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {selectedProduct.articleNumber}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer rounded-md p-1 text-muted-foreground transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Remove selected product"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Search by product name or article number..."
          className="pl-9"
          aria-label="Search for a product"
          aria-expanded={showDropdown}
          role="combobox"
          aria-autocomplete="list"
        />
        {loading && (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground motion-safe:animate-spin"
            aria-hidden="true"
          />
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-border bg-popover shadow-lg"
          role="listbox"
        >
          {results.map((r) => (
            <button
              key={r.articleNumber}
              type="button"
              role="option"
              aria-selected={false}
              className="flex w-full min-h-[44px] cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors duration-200 ease-out hover:bg-accent"
              onClick={() => {
                onSelect({
                  id: 0, // Will be resolved server-side by article number
                  name: r.name || "Unknown",
                  articleNumber: r.articleNumber,
                  imageUrl: r.imageUrl,
                });
                setQuery("");
                setShowDropdown(false);
              }}
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
                <p className="truncate text-sm font-medium">
                  {r.name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.articleNumber}
                  {r.price != null && ` — $${r.price.toFixed(2)}`}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-popover px-3 py-4 text-center text-sm text-muted-foreground shadow-lg">
          No products found
        </div>
      )}
    </div>
  );
}

export function VideoSubmissionForm() {
  const [state, action, isPending] = useActionState(formAction, initialState);
  const [selectedProduct, setSelectedProduct] = useState<{
    id: number;
    name: string;
    articleNumber: string;
    imageUrl: string | null;
  } | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const videoId = youtubeUrl ? extractVideoId(youtubeUrl) : null;

  const handleProductSelect = useCallback(
    (product: { id: number; name: string; articleNumber: string; imageUrl: string | null }) => {
      setSelectedProduct(product);
    },
    []
  );

  if (state.success) {
    return (
      <div className="mt-8 rounded-lg border border-green-500/30 bg-green-500/5 p-6 text-center dark:bg-green-500/10">
        <CheckCircle2
          className="mx-auto h-10 w-10 text-green-600 dark:text-green-500"
          aria-hidden="true"
        />
        <h2 className="mt-4 text-lg font-semibold">Video Submitted</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your video guide is pending review. You will see it on your creator
          profile once approved.
        </p>
        <Button
          className="mt-6"
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Submit Another Video
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 flex flex-col gap-6">
      {state.error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive dark:bg-destructive/10"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {state.error}
        </div>
      )}

      {/* Product Search */}
      <div className="flex flex-col gap-3">
        <Label>
          Product <span className="text-primary">*</span>
        </Label>
        <ProductSearchPicker
          selectedProduct={selectedProduct}
          onSelect={handleProductSelect}
          onClear={() => setSelectedProduct(null)}
        />
        {/* Hidden input to submit the article number (resolved to ID server-side) */}
        <input
          type="hidden"
          name="productArticleNumber"
          value={selectedProduct?.articleNumber || ""}
        />
        {state.fieldErrors?.productArticleNumber && (
          <p
            role="alert"
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {state.fieldErrors.productArticleNumber[0]}
          </p>
        )}
      </div>

      {/* YouTube URL */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="youtubeUrl">
          YouTube Video URL <span className="text-primary">*</span>
        </Label>
        <div className="relative">
          <Youtube
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            id="youtubeUrl"
            name="youtubeUrl"
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            required
            className="pl-10"
            aria-describedby="youtubeUrl-help youtubeUrl-error"
            aria-invalid={!!state.fieldErrors?.youtubeUrl}
          />
        </div>
        <p id="youtubeUrl-help" className="text-xs text-muted-foreground">
          Paste a YouTube video URL. Supported formats: youtube.com/watch,
          youtu.be, youtube.com/shorts
        </p>
        {state.fieldErrors?.youtubeUrl && (
          <p
            id="youtubeUrl-error"
            role="alert"
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {state.fieldErrors.youtubeUrl[0]}
          </p>
        )}

        {/* YouTube thumbnail preview */}
        {videoId && (
          <div className="overflow-hidden rounded-lg border border-border">
            <Image
              src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
              alt="Video thumbnail"
              width={320}
              height={180}
              className="w-full object-cover"
              unoptimized
            />
          </div>
        )}
      </div>

      {/* Title */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="title">
          Video Title <span className="text-primary">*</span>
        </Label>
        <Input
          id="title"
          name="title"
          type="text"
          placeholder="e.g. KALLAX Shelf Unit Assembly Guide"
          required
          maxLength={200}
          aria-describedby="title-error"
          aria-invalid={!!state.fieldErrors?.title}
        />
        {state.fieldErrors?.title && (
          <p
            id="title-error"
            role="alert"
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {state.fieldErrors.title[0]}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Briefly describe what this video covers..."
          maxLength={2000}
          rows={3}
          aria-describedby="description-error"
          aria-invalid={!!state.fieldErrors?.description}
        />
        {state.fieldErrors?.description && (
          <p
            id="description-error"
            role="alert"
            className="flex items-center gap-1.5 text-sm text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {state.fieldErrors.description[0]}
          </p>
        )}
      </div>

      {/* Language */}
      <div className="flex flex-col gap-3">
        <Label htmlFor="language">Language</Label>
        <select
          id="language"
          name="language"
          defaultValue="en"
          className="flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.value} value={lang.value}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <Button
        type="submit"
        size="lg"
        disabled={isPending || !selectedProduct}
        aria-busy={isPending}
      >
        {isPending ? (
          <>
            <Loader2
              className="h-4 w-4 motion-safe:animate-spin"
              aria-hidden="true"
            />
            Submitting...
          </>
        ) : (
          "Submit Video Guide"
        )}
      </Button>
    </form>
  );
}
