"use client";

import { useState } from "react";
import { App, Button, Upload } from "antd";
import type { UploadProps } from "antd";
import { Paperclip, X } from "lucide-react";
import { useChunkUpload } from "@/features/core/files/useFile";
import { resolveStorageFileUrl } from "@/utils/storageUrl";

type ExpenseReceiptUploadProps = {
  value?: string;
  onChange?: (value?: string) => void;
  disabled?: boolean;
};

export function expenseReceiptDisplayUrl(receiptUrl: string | null | undefined): string {
  return resolveStorageFileUrl(receiptUrl, { bucket: "public", isPublic: true });
}

export function expenseReceiptIsPdf(receiptUrl: string | null | undefined): boolean {
  if (!receiptUrl) return false;
  return /\.pdf($|\?)/i.test(receiptUrl);
}

function extractUploadedUrl(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const root = result as Record<string, unknown>;
  const data = root.data;
  if (typeof data === "string" && data.trim()) return data;
  if (data && typeof data === "object") {
    const row = data as Record<string, unknown>;
    if (typeof row.url === "string" && row.url.trim()) return row.url;
    if (Array.isArray(row) && row[0] && typeof row[0] === "object") {
      const first = row[0] as Record<string, unknown>;
      if (typeof first.url === "string" && first.url.trim()) return first.url;
    }
  }
  if (typeof root.url === "string" && root.url.trim()) return root.url;
  return null;
}

export default function ExpenseReceiptUpload({
  value,
  onChange,
  disabled,
}: ExpenseReceiptUploadProps) {
  const { message } = App.useApp();
  const { chunkUpload, chunkUploading } = useChunkUpload();
  const [uploading, setUploading] = useState(false);

  const uploadProps: UploadProps = {
    accept: "image/*,.pdf",
    showUploadList: false,
    disabled: disabled || uploading || chunkUploading,
    beforeUpload: async (file) => {
      setUploading(true);
      try {
        const result = await chunkUpload(
          file,
          "assets",
          file.type.includes("pdf") ? "document" : "image",
          true,
          () => {},
          false,
          "expense-receipts",
        );
        const url = extractUploadedUrl(result);
        if (!url) throw new Error("Upload did not return a file URL");
        onChange?.(url);
        message.success("Receipt uploaded");
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
      return false;
    },
  };

  const displayUrl = expenseReceiptDisplayUrl(value);

  return (
    <div>
      {value ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <a href={displayUrl} target="_blank" rel="noopener noreferrer">
            {expenseReceiptIsPdf(value) ? "View PDF receipt" : "View receipt"}
          </a>
          {!disabled ? (
            <Button
              type="text"
              size="small"
              icon={<X size={14} />}
              onClick={() => onChange?.(undefined)}
              aria-label="Remove receipt"
            />
          ) : null}
        </div>
      ) : null}
      <Upload {...uploadProps}>
        <Button
          loading={uploading || chunkUploading}
          disabled={disabled}
          icon={<Paperclip size={14} />}
        >
          {value ? "Replace receipt" : "Upload receipt"}
        </Button>
      </Upload>
    </div>
  );
}
