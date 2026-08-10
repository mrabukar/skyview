"use client";

import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Camera, Loader2, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Phase = "requesting" | "live" | "captured" | "error";

interface Props {
  onClose: () => void;
  /** Called with the captured still frame as a File, ready for the same upload path as a picked file. */
  onCapture: (file: File) => void;
}

/**
 * In-browser camera capture (getUserMedia → live preview → snap a still
 * frame) for attaching a receipt photo without leaving the page. On desktop
 * this is the only way to get a "take a photo" option — the plain
 * `<input capture>` fallback used elsewhere only opens the camera on mobile.
 *
 * Mount this only while it should be visible (e.g. `{cameraOpen && <CameraCaptureDialog .../>}`)
 * rather than passing an `open` prop — each open is a fresh mount, so state
 * (phase/error/captured frame) starts clean with no manual reset needed.
 */
export function CameraCaptureDialog({ onClose, onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("requesting");
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<{ file: File; url: string } | null>(
    null,
  );

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setPhase("live");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof DOMException && err.name === "NotAllowedError"
            ? 'Camera access was denied. Allow camera access, or use "Attach / photo" instead.'
            : 'Couldn\'t access a camera on this device. Use "Attach / photo" instead.',
        );
        setPhase("error");
      });

    return () => {
      cancelled = true;
      stopStream();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (captured) URL.revokeObjectURL(captured.url);
    };
  }, [captured]);

  const handleClose = () => {
    stopStream();
    onClose();
  };

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `receipt-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        setCaptured({ file, url: URL.createObjectURL(file) });
        setPhase("captured");
      },
      "image/jpeg",
      0.92,
    );
  };

  const retake = () => {
    if (captured) URL.revokeObjectURL(captured.url);
    setCaptured(null);
    setPhase("live");
  };

  const usePhoto = () => {
    if (!captured) return;
    onCapture(captured.file);
    handleClose();
  };

  return (
    <Dialog.Root open onOpenChange={(next) => !next && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[300] bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[300] grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg">
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold leading-none tracking-tight">
              Take Photo
            </Dialog.Title>
            <Dialog.Close
              className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              onClick={handleClose}
            >
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Use your camera to take a photo of the receipt.
          </Dialog.Description>

          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-md bg-muted">
            {phase === "requesting" ? (
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            ) : phase === "error" ? (
              <p className="px-6 text-center text-sm text-muted-foreground">
                {error}
              </p>
            ) : null}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={cn(
                "h-full w-full object-cover",
                phase !== "live" && "hidden",
              )}
            />
            {captured ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={captured.url}
                alt="Captured receipt"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          <div className="flex justify-end gap-2">
            {phase === "live" ? (
              <>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="button" onClick={capture}>
                  <Camera className="size-4" />
                  Capture
                </Button>
              </>
            ) : phase === "captured" ? (
              <>
                <Button type="button" variant="outline" onClick={retake}>
                  <RotateCcw className="size-4" />
                  Retake
                </Button>
                <Button type="button" onClick={usePhoto}>
                  Use Photo
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" onClick={handleClose}>
                Close
              </Button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
