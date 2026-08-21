"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { exportMenuItemImage } from "@/lib/pos/menu-item-image";

interface Props {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (file: File, previewUrl: string) => void;
}

/** Visible 3:4 frame inside the item modal. Export is always 600×800. */
const STAGE_W = 270;
const STAGE_H = 360;

/** Fit the whole photo in the frame (object-contain). Never crop the cup at 1×. */
function containScale(nw: number, nh: number) {
  if (!nw || !nh) return 1;
  return Math.min(STAGE_W / nw, STAGE_H / nh);
}

function clampOffset(
  x: number,
  y: number,
  zoom: number,
  nw: number,
  nh: number,
) {
  const scale = containScale(nw, nh) * zoom;
  const maxX = Math.max(0, (nw * scale - STAGE_W) / 2);
  const maxY = Math.max(0, (nh * scale - STAGE_H) / 2);
  return {
    x: Math.min(maxX, Math.max(-maxX, x)),
    y: Math.min(maxY, Math.max(-maxY, y)),
  };
}

export function MenuItemImageCropDialog({
  imageSrc,
  onCancel,
  onConfirm,
}: Props) {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    ox: number;
    oy: number;
  } | null>(null);

  const scale = containScale(natural.w, natural.h) * zoom;
  const displayedW = natural.w * scale;
  const displayedH = natural.h * scale;

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNatural({ w: 0, h: 0 });
    setError(null);
  }, [imageSrc]);

  const handleZoom = (next: number) => {
    setZoom(next);
    setOffset((prev) =>
      clampOffset(prev.x, prev.y, next, natural.w, natural.h),
    );
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !natural.w) return;
    setOffset(
      clampOffset(
        drag.current.ox + (e.clientX - drag.current.x),
        drag.current.oy + (e.clientY - drag.current.y),
        zoom,
        natural.w,
        natural.h,
      ),
    );
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  const handleConfirm = async () => {
    if (!natural.w || !natural.h) return;
    setBusy(true);
    setError(null);
    try {
      const s = containScale(natural.w, natural.h) * zoom;
      const imgLeft = (STAGE_W - natural.w * s) / 2 + offset.x;
      const imgTop = (STAGE_H - natural.h * s) / 2 + offset.y;
      const crop = {
        x: (0 - imgLeft) / s,
        y: (0 - imgTop) / s,
        width: STAGE_W / s,
        height: STAGE_H / s,
      };
      const file = await exportMenuItemImage(imageSrc, crop);
      const previewUrl = URL.createObjectURL(file);
      onConfirm(file, previewUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not crop that image.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-1.5 border-b border-border p-6 pb-4">
        <h2 className="text-lg font-semibold leading-none tracking-tight">
          Frame menu image
        </h2>
        <p className="text-sm text-muted-foreground">
          Recommended 600 × 800 px (3:4). The whole cup stays in frame —
          extra space is transparent so the menu card can show through.
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto p-6">
        <div
          className="relative cursor-move overflow-hidden rounded-lg select-none bg-[repeating-conic-gradient(#e8e0d4_0%_25%,#f7f1e8_0%_50%)] bg-size-[12px_12px]"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            touchAction: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Crop preview"
            draggable={false}
            onLoad={(e) =>
              setNatural({
                w: e.currentTarget.naturalWidth,
                h: e.currentTarget.naturalHeight,
              })
            }
            onError={() => setError("Could not read that image.")}
            style={{
              position: "absolute",
              width: displayedW,
              height: displayedH,
              left: (STAGE_W - displayedW) / 2 + offset.x,
              top: (STAGE_H - displayedH) / 2 + offset.y,
              maxWidth: "none",
              maxHeight: "none",
              opacity: natural.w ? 1 : 0,
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        </div>

        <label className="mt-4 flex w-full max-w-[270px] items-center gap-2 text-xs text-muted-foreground">
          Zoom
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => handleZoom(Number(e.target.value))}
            className="flex-1"
          />
        </label>
        {error ? (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        ) : null}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-border p-6 pt-4 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={() => void handleConfirm()}
          disabled={busy || !natural.w}
        >
          {busy ? "Exporting…" : "Use this frame"}
        </Button>
      </div>
    </>
  );
}
