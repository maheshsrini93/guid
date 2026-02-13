"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface OcrCaptureProps {
  onOcrResult: (text: string) => void;
}

// Regex to match IKEA-style article numbers (e.g., "702.758.14", "10234567")
const ARTICLE_NUMBER_PATTERN = /\d{3}\.\d{3}\.\d{2}|\d{8,10}/g;

export function OcrCapture({ onOcrResult }: OcrCaptureProps) {
  const [hasCamera, setHasCamera] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  // Track unmount to prevent post-unmount state updates from OCR
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Detect camera availability
  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          const videoDevices = devices.filter((d) => d.kind === "videoinput");
          setHasCamera(videoDevices.length > 0);
        })
        .catch(() => setHasCamera(false));
    }
  }, []);

  const startCamera = useCallback(async () => {
    setError(null);
    setCapturedImage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : "Could not start camera. Please try again.";
      setError(message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const runOcr = useCallback(
    async (imageData: string) => {
      setProcessing(true);
      setStatusText("Loading OCR engine...");

      try {
        const Tesseract = await import("tesseract.js");
        if (!mountedRef.current) return;
        setStatusText("Reading text from image...");

        const result = await Tesseract.recognize(imageData, "eng", {
          logger: (info: { status: string; progress: number }) => {
            if (!mountedRef.current) return;
            if (info.status === "recognizing text") {
              const pct = Math.round(info.progress * 100);
              setStatusText(`Reading text... ${pct}%`);
            }
          },
        });

        if (!mountedRef.current) return;

        const extractedText = result.data.text.trim();

        if (!extractedText) {
          setError(
            "No text detected in the image. Try taking a clearer photo of the product label."
          );
          setProcessing(false);
          return;
        }

        // Look for article numbers first
        const articleMatches = extractedText.match(ARTICLE_NUMBER_PATTERN);
        if (articleMatches && articleMatches.length > 0) {
          onOcrResult(articleMatches[0]);
        } else {
          // Fall back to the full extracted text (trimmed to reasonable length)
          const cleanText = extractedText
            .replace(/\n+/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 100);
          onOcrResult(cleanText);
        }

        setOpen(false);
      } catch {
        if (!mountedRef.current) return;
        setError("OCR processing failed. Please try again with a clearer photo.");
      } finally {
        if (mountedRef.current) {
          setProcessing(false);
          setStatusText("");
        }
      }
    },
    [onOcrResult]
  );

  // Start camera when sheet opens
  useEffect(() => {
    if (open) {
      const timer = setTimeout(startCamera, 300);
      return () => clearTimeout(timer);
    } else {
      stopCamera();
      setCapturedImage(null);
      setError(null);
      setProcessing(false);
      setStatusText("");
    }
  }, [open, startCamera, stopCamera]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  if (!hasCamera) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[44px] w-[44px] items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent motion-safe:transition-colors motion-safe:duration-200 cursor-pointer"
        aria-label="Photograph product label"
      >
        <Camera className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="h-[85vh] sm:h-[70vh] rounded-t-xl p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">
                Photograph Product Label
              </SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Close camera"
                className="cursor-pointer"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Take a photo of the product name or article number label
            </p>
          </SheetHeader>

          <div className="flex-1 flex flex-col items-center justify-center px-4 pb-4 gap-4">
            {error && (
              <div
                role="alert"
                className="w-full rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            {/* Camera preview */}
            {!capturedImage && !error && (
              <div className="w-full max-w-md rounded-lg overflow-hidden bg-muted relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full"
                  style={{ minHeight: "250px", objectFit: "cover" }}
                />
              </div>
            )}

            {/* Captured image preview */}
            {capturedImage && (
              <div className="w-full max-w-md rounded-lg overflow-hidden bg-muted relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedImage}
                  alt="Captured product label"
                  className="w-full"
                />
                {processing && (
                  <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 text-primary motion-safe:animate-spin" />
                    <p className="text-sm font-medium">{statusText}</p>
                  </div>
                )}
              </div>
            )}

            {/* Hidden canvas for capturing */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Action buttons */}
            <div className="flex gap-3 w-full max-w-md">
              {!capturedImage && !error && (
                <Button
                  onClick={capturePhoto}
                  className="flex-1 min-h-[48px] cursor-pointer"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Take Photo
                </Button>
              )}

              {capturedImage && !processing && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCapturedImage(null);
                      setError(null);
                      startCamera();
                    }}
                    className="flex-1 min-h-[48px] cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    onClick={() => runOcr(capturedImage)}
                    className="flex-1 min-h-[48px] cursor-pointer"
                  >
                    Search from Photo
                  </Button>
                </>
              )}

              {error && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setError(null);
                    startCamera();
                  }}
                  className="flex-1 min-h-[48px] cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center max-w-xs">
              The text will be extracted and used to search for products.
              Article numbers (e.g., 702.758.14) are detected automatically.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
