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
  useDeleteUserAttachment,
  useUploadUserAttachment,
  useUserAttachments,
} from "@/hooks/user-attachments/use-user-attachments";
import { useAppStore } from "@/store/app";
import {
  USER_ATTACHMENT_ACCEPT,
  USER_ATTACHMENT_MAX_SIZE,
  type UserAttachment,
} from "@/types/user-attachments/user-attachment";

interface Props {
  userId: string;
  /** When true, hide upload/delete controls (manager viewing own docs). */
  readOnly?: boolean;
  /**
   * Requests that the host open its camera capture view. Required when
   * `readOnly` is false. Host owns the camera UI inside its own Dialog.
   */
  onRequestCamera?: (onCapture: (file: File) => void) => void;
}

export function UserAttachmentsManager({
  userId,
  readOnly = false,
  onRequestCamera,
}: Props) {
  const addToast = useAppStore((s) => s.addToast);
  const addErrorToast = useAppStore((s) => s.addErrorToast);
  const inputRef = useRef<HTMLInputElement>(null);
  const [confirmDelete, setConfirmDelete] = useState<UserAttachment | null>(
    null,
  );

  const { data: attachments, isPending } = useUserAttachments(userId);
  const upload = useUploadUserAttachment();
  const remove = useDeleteUserAttachment();

  const uploadFile = async (file: File) => {
    if (!USER_ATTACHMENT_ACCEPT.split(",").includes(file.type)) {
      addErrorToast({
        title: "Unsupported file",
        sub: "Use a JPEG, PNG, WebP image or a PDF.",
      });
      return;
    }
    if (file.size > USER_ATTACHMENT_MAX_SIZE) {
      addErrorToast({ title: "File too large", sub: "Maximum size is 10 MB." });
      return;
    }

    try {
      await upload.mutateAsync({ userId, file });
      addToast({ title: "Document attached" });
    } catch (err) {
      addErrorToast({
        title: "Upload failed",
        sub: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const file of files) await uploadFile(file);
  };

  const handleDelete = async (attachment: UserAttachment) => {
    try {
      await remove.mutateAsync({ id: attachment.id, userId });
      addToast({ title: "Document removed" });
      setConfirmDelete(null);
    } catch (err) {
      addErrorToast({
        title: "Could not remove document",
        sub: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium leading-none">Attachments</label>
        {!readOnly ? (
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
              Attach
            </Button>
            {onRequestCamera ? (
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
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept={USER_ATTACHMENT_ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => void onPick(e)}
            />
          </div>
        ) : null}
      </div>

      {isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (attachments?.length ?? 0) === 0 ? (
        <p className="text-sm text-muted-foreground">
          {readOnly
            ? "No documents attached to your account yet."
            : "No documents yet. Attach an ID, contract, or photo (JPEG, PNG, WebP, or PDF)."}
        </p>
      ) : (
        <div className="grid gap-1.5">
          {attachments!.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2"
            >
              {a.contentType === "application/pdf" ? (
                <FileText className="size-4 shrink-0 text-muted-foreground" />
              ) : (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" />
              )}
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm text-primary hover:underline"
                title={a.originalName}
              >
                {a.originalName}
              </a>
              {!readOnly ? (
                <button
                  type="button"
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
                  onClick={() => setConfirmDelete(a)}
                  aria-label="Remove document"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      {confirmDelete ? (
        <ConfirmDialog
          title="Remove this document?"
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
