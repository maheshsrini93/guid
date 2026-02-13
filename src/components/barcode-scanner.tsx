"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ScanLine, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface BarcodeScannerProps {
  onScanResult: (code: string) => void;
}

export function BarcodeScanner({ onScanResult }: BarcodeScannerProps) {
  const [hasCamera, setHasCamera] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<import("html5-qrcode").Html5Qrcode | null>(
    null
  );

  // Detect camera availability on mount
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

  const stopScanner = useCallback(() => {
    if (html5QrCodeRef.current) {
      html5QrCodeRef.current
        .stop()
        .then(() => {
          html5QrCodeRef.current?.clear();
          html5QrCodeRef.current = null;
        })
        .catch(() => {});
    }
    setScanning(false);
  }, []);

  const startScanner = useCallback(async () => {
    if (!scannerRef.current) return;

    setError(null);
    setScanning(true);

    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      const scannerId = "barcode-scanner-region";
      scannerRef.current.id = scannerId;

      const scanner = new Html5Qrcode(scannerId);
      html5QrCodeRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          onScanResult(decodedText);
          stopScanner();
          setOpen(false);
        },
        () => {
          // Scan failure on each frame — expected, not an error
        }
      );
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings to scan barcodes."
          : "Could not start camera. Please try again.";
      setError(message);
      setScanning(false);
    }
  }, [onScanResult, stopScanner]);

  // Start scanner when sheet opens
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(startScanner, 300);
      return () => clearTimeout(timer);
    } else {
      stopScanner();
    }
  }, [open, startScanner, stopScanner]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  if (!hasCamera) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-[44px] w-[44px] items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent motion-safe:transition-colors motion-safe:duration-200 cursor-pointer"
        aria-label="Scan barcode"
      >
        <ScanLine className="h-5 w-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="h-[85vh] sm:h-[70vh] rounded-t-xl p-0"
        >
          <SheetHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-lg">Scan Barcode or QR Code</SheetTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                aria-label="Close scanner"
                className="cursor-pointer"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Point your camera at a product barcode or QR code
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

            {scanning && !error && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 motion-safe:animate-spin" />
                <span>Looking for barcodes...</span>
              </div>
            )}

            <div
              ref={scannerRef}
              className="w-full max-w-md rounded-lg overflow-hidden bg-muted"
              style={{ minHeight: "300px" }}
            />

            <p className="text-xs text-muted-foreground text-center max-w-xs">
              Supports EAN, UPC, Code128, QR codes, and more. The code will be
              used to search for products.
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
