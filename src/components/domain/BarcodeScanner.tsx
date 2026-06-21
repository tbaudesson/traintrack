"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, ScanLine } from "lucide-react";

// Minimal typing for the experimental BarcodeDetector API.
interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorLike { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

export function BarcodeScanner({
  open,
  onOpenChange,
  onDetected,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called with the scanned/typed barcode string. */
  onDetected: (code: string) => void;
}) {
  const t = useTranslations("nutrition");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;
    const Ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Ctor) {
      setSupported(false);
      return;
    }
    let cancelled = false;
    const detector = new Ctor({ formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"] });

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) { stream.getTracks().forEach((tr) => tr.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          scan();
        }
      } catch {
        setError(t("cameraDenied"));
      }
    })();

    async function scan() {
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        rafRef.current = requestAnimationFrame(scan);
        return;
      }
      try {
        const codes = await detector.detect(video);
        if (codes.length > 0) {
          finish(codes[0].rawValue);
          return;
        }
      } catch {
        // transient detect error — keep trying
      }
      rafRef.current = requestAnimationFrame(scan);
    }

    function finish(code: string) {
      cleanup();
      onDetected(code);
    }

    function cleanup() {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-accent-500" />
            {t("scanTitle")}
          </DialogTitle>
        </DialogHeader>

        {supported && !error ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-lg bg-black">
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video ref={videoRef} className="h-56 w-full object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-accent-400/80" />
            </div>
            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("scanning")}
            </p>
          </div>
        ) : (
          <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {error ?? t("scanUnsupported")}
          </p>
        )}

        {/* Manual entry fallback (always available) */}
        <div className="mt-2 space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t("enterBarcode")}</label>
          <div className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="0000000000000"
            />
            <Button onClick={() => manual && onDetected(manual)} disabled={!manual}>
              {t("lookup")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
