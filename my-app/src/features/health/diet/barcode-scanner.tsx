"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

// Restrict decoding to retail product barcodes. Without this, ZXing also reads
// QR codes — so a marketing QR on the packaging would decode to a URL instead
// of the product's EAN/UPC.
const PRODUCT_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
];
const HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, PRODUCT_FORMATS],
  // Spend more effort per frame. The default fast pass gives up on the slightly
  // blurred / angled captures you get from a handheld phone; TRY_HARDER is the
  // difference between "camera shows but never decodes" and an actual read.
  [DecodeHintType.TRY_HARDER, true],
]);

// Ask the camera for a high-res stream. decodeFromConstraints requests no
// resolution by default, so mobile browsers commonly hand back 640×480 — too
// few pixels per bar for ZXing to resolve an EAN/UPC at arm's length. Values
// are `ideal`, so devices without a 1080p rear camera still fall back cleanly.
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
};

// Camera barcode scanner (ZXing). Opens a modal, streams the rear camera, and
// calls onDetected with the first decoded barcode. The stream is always torn
// down on close/unmount. Camera access requires HTTPS or localhost.
export function BarcodeScanner({
  onDetected,
}: {
  onDetected: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hold the latest callback in a ref so starting the camera never depends on
  // its identity. A non-memoized onDetected from the parent would otherwise
  // restart the stream on every parent render — and Android only allows one
  // camera consumer at a time, so the overlap leaves the feed blank.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  // Start the camera from a callback ref rather than an effect, so it only runs
  // once the <video> is actually mounted in the portaled/animated dialog. An
  // effect keyed on `open` can fire before Base UI mounts the popup, leaving
  // videoRef null — ZXing then streams into a hidden element and our box stays
  // black. The returned function is a React 19 ref cleanup that tears down.
  const startScanner = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;
    const reader = new BrowserMultiFormatReader(HINTS);
    let controls: IScannerControls | null = null;
    let stopped = false;

    reader
      .decodeFromConstraints(
        // Prefer the rear camera on phones; `ideal` falls back to whatever
        // exists (e.g. a laptop's only, front-facing camera).
        { video: VIDEO_CONSTRAINTS },
        video,
        (result) => {
          if (result && !stopped) {
            stopped = true;
            controls?.stop();
            onDetectedRef.current(result.getText());
            setOpen(false);
          }
        },
      )
      .then((c) => {
        if (stopped) c.stop();
        else controls = c;
      })
      .catch(() => {
        setError(
          "Couldn't access the camera. Check permissions, or type the barcode/food name manually.",
        );
      });

    return () => {
      stopped = true;
      controls?.stop();
    };
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <ScanLine className="size-4" />
        Scan barcode
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Scan a barcode</DialogTitle>
          <DialogDescription>
            Point your camera at a product barcode.
          </DialogDescription>
          {error ? (
            <p className="text-destructive text-sm">{error}</p>
          ) : (
            <video
              ref={startScanner}
              className="aspect-video w-full rounded-md bg-black"
              autoPlay
              muted
              playsInline
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
