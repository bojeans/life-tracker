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

// Retail product barcodes only — without this, QR codes on packaging decode to
// URLs instead of the product's EAN/UPC. Expressed twice: the @zxing/library
// enum for the ZXing fallback, and the lowercase string form the native
// BarcodeDetector expects.
const ZXING_FORMATS = [
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
];
const DETECTOR_FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

const HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, ZXING_FORMATS],
  [DecodeHintType.TRY_HARDER, true],
]);

// Prefer the rear camera, high-res, with continuous autofocus. The missing
// autofocus is a common reason a "visible but never decodes" scan fails on a
// handheld phone. focusMode isn't in the standard MediaTrackConstraints type,
// so the advanced set is cast in.
const VIDEO_CONSTRAINTS: MediaTrackConstraints = {
  facingMode: { ideal: "environment" },
  width: { ideal: 1920 },
  height: { ideal: 1080 },
  advanced: [{ focusMode: "continuous" }] as unknown as MediaTrackConstraintSet[],
};

// Native BarcodeDetector (Chrome/Android) isn't in the TS DOM lib yet — minimal
// shapes for what we call.
type DetectedBarcode = { rawValue: string };
type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
};

function getBarcodeDetectorCtor(): BarcodeDetectorCtor | null {
  return (
    (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ??
    null
  );
}

async function detectorSupportsProductCodes(
  Ctor: BarcodeDetectorCtor,
): Promise<boolean> {
  // If the capability query is missing, optimistically try the detector anyway.
  if (!Ctor.getSupportedFormats) return true;
  try {
    const supported = await Ctor.getSupportedFormats();
    return DETECTOR_FORMATS.some((f) => supported.includes(f));
  } catch {
    return false;
  }
}

// Camera barcode scanner. Opens a modal, streams the rear camera, and calls
// onDetected with the first decoded barcode. Uses the native BarcodeDetector
// when the browser supports it (much more reliable on Android) and falls back
// to ZXing otherwise. The stream is always torn down on close/unmount. Camera
// access requires HTTPS or localhost.
export function BarcodeScanner({
  onDetected,
}: {
  onDetected: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hold the latest callback in a ref so starting the camera never depends on
  // its identity (a non-memoized onDetected would otherwise restart the stream
  // on every parent render, and Android allows only one camera consumer).
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  // Start from a callback ref rather than an effect, so it only runs once the
  // <video> is actually mounted in the portaled/animated dialog. The returned
  // function is the React 19 ref cleanup that tears everything down.
  const startScanner = useCallback((video: HTMLVideoElement | null) => {
    if (!video) return;
    let stopped = false;
    let stream: MediaStream | null = null;
    let controls: IScannerControls | null = null;
    let frame: number | null = null;

    const finish = (code: string) => {
      if (stopped) return;
      stopped = true;
      onDetectedRef.current(code);
      setOpen(false);
    };

    const fail = () => {
      if (stopped) return;
      setError(
        "Couldn't access the camera. Check permissions, or type the barcode/food name manually.",
      );
    };

    (async () => {
      const Ctor = getBarcodeDetectorCtor();
      const useDetector = Ctor
        ? await detectorSupportsProductCodes(Ctor)
        : false;
      if (stopped) return;

      if (useDetector && Ctor) {
        // Native path: own the stream ourselves and poll detect() per frame.
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: VIDEO_CONSTRAINTS,
          });
          if (stopped) return;
          video.srcObject = stream;
          await video.play().catch(() => {});

          const detector = new Ctor({ formats: DETECTOR_FORMATS });
          const scan = async () => {
            if (stopped) return;
            try {
              const codes = await detector.detect(video);
              const value = codes[0]?.rawValue;
              if (value) {
                finish(value);
                return;
              }
            } catch {
              // Ignore transient per-frame decode errors and keep scanning.
            }
            if (!stopped) frame = requestAnimationFrame(scan);
          };
          frame = requestAnimationFrame(scan);
        } catch {
          fail();
        }
        return;
      }

      // Fallback path: let ZXing own the stream via decodeFromConstraints.
      const reader = new BrowserMultiFormatReader(HINTS);
      reader
        .decodeFromConstraints({ video: VIDEO_CONSTRAINTS }, video, (result) => {
          if (result) finish(result.getText());
        })
        .then((c) => {
          if (stopped) c.stop();
          else controls = c;
        })
        .catch(fail);
    })();

    return () => {
      stopped = true;
      if (frame != null) cancelAnimationFrame(frame);
      controls?.stop();
      stream?.getTracks().forEach((t) => t.stop());
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
