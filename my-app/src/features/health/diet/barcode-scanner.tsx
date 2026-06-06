"use client";

import { useEffect, useRef, useState } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

// Camera barcode scanner (ZXing). Opens a modal, streams the camera, and calls
// onDetected with the first decoded barcode. The camera stream is always torn
// down on close/unmount. Camera access requires HTTPS or localhost.
export function BarcodeScanner({
  onDetected,
}: {
  onDetected: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    const reader = new BrowserMultiFormatReader();

    const stop = () => {
      controlsRef.current?.stop();
      controlsRef.current = null;
    };

    reader
      .decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
        if (result && active) {
          onDetected(result.getText());
          stop();
          setOpen(false);
        }
      })
      .then((controls) => {
        if (active) controlsRef.current = controls;
        else controls.stop();
      })
      .catch(() => {
        if (active) {
          setError(
            "Couldn't access the camera. Check permissions, or type the barcode/food name manually.",
          );
        }
      });

    return () => {
      active = false;
      stop();
    };
  }, [open, onDetected]);

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
              ref={videoRef}
              className="aspect-video w-full rounded-md bg-black"
              muted
              playsInline
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
