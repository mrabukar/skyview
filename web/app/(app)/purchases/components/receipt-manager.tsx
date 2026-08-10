"use client";

import { useRef, useState } from "react";
import {
  Camera,
  FileText,
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useDeleteReceipt,
  usePurchaseReceipts,
  useUploadReceipt,
} from "@/hooks/receipts/use-receipts";
import { useAppStore } from "@/store/app";
import {
  RECEIPT_ACCEPT,
  RECEIPT_MAX_SIZE,
  type Receipt,
} from "@/types/receipts/receipt";

interface Props {
  purchaseId: string;
  /**
   * Requests that the host open its camera capture view, calling back with
   * the captured file. The host owns the camera UI (rendered inside its own
   * `Dialog.Content`) rather than this component opening a second Dialog —
   * see the comment on `CameraCapturePanel` for why nesting two modal
   * Dialogs breaks on mobile.
   */
  onRequestCamera: (onCapture: (file: File) => void) => void;
}

export function ReceiptManager({ purchaseId, onRequestCamera }: Props) {
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<Receipt | null>(null);

  const { data: receipts, isPending } = usePurchaseReceipts(purchaseId);
  const upload = useUploadReceipt();
  const remove = useDeleteReceipt();

  const uploadFile = async (file: File) => {
    if (!RECEIPT_ACCEPT.split(",").includes(file.type)) {
      addErrorToast({
        title: "Unsupported file",
        sub: "Use a JP, PNG, WebP image or a PDF.",
      });
      return;
    }
    if (file.size > RECEIPT_MAX_SIZE) {
      addErrorToast({ title: "File too large", sub: "Maximum size is 10 MB." });
      return;
    }

    try {
      await upload.mutateAsync({ purchaseId, file });
      addToast({ title: "Receipt attached" });
    } catch (err) {
      addErrorToast({
        title: "Upload failed",
        sub: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    await uploadFile(file);
  };

  const handleDelete = async (receipt: Receipt) => {
    try {
      await remove.mutateAsync(receipt.id);
      addToast({ title: "Receipt removed" });
      setConfirmDelete(null);
    } catch (err) {
      addErrorToast({
        title: "Could not remove receipt",
        sub: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium leading-none">Receipts</label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
          >
            {upload.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Attach / photo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRequestCamera((file) => void uploadFile(file))}
            disabled={upload.isPending}
          >
            <Camera className="size-4" />
            Take Photo
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={RECEIPT_ACCEPT}
          capture="environment"
          className="hidden"
          onChange={(e) => void onPick(e)}
        />
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (receipts?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
          No receipts yet. Attach a photo or PDF of the receipt.
        </p>
      ) : (
        <div className="grid gap-1.5">
          {receipts!.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2"
            >
              {r.contentType === "application/pdf" ? (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm text-primary hover:underline"
                title={r.originalName}
              >
                {r.originalName}
              </a>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                onClick={() => setConfirmDelete(r)}
                aria-label="Remove receipt"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {confirmDelete ? (
        <ConfirmDialog
          title="Remove this receipt?"
          message={`"${confirmDelete.originalName}" will be permanently deleted.`}
          confirmLabel="Remove"
          isLoading={remove.isPending}
          onConfirm={() => void handleDelete(confirmDelete)}
          onClose={() => setConfirmDelete(null)}
        />
      ) : null}
    </div>
  );
}
