/**
 * Download helper that works in mobile browsers and installed PWAs (including iOS standalone).
 */
export async function downloadBlob(
  blob: Blob,
  filename: string,
  mimeType?: string,
): Promise<{ ok: boolean; message?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, message: "Download is only available in the browser." };
  }

  const safeName = filename.trim() || "download";
  const file = new File([blob], safeName, {
    type: mimeType ?? (blob.type || "application/octet-stream"),
  });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: safeName });
      return { ok: true };
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return { ok: false, message: "Share cancelled." };
      }
    }
  }

  const url = URL.createObjectURL(blob);
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = safeName;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return { ok: true };
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
    return { ok: true, message: "Opened file in a new tab — use Save from there if needed." };
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
}

export async function downloadDataUrl(
  dataUrl: string,
  filename: string,
): Promise<{ ok: boolean; message?: string }> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return downloadBlob(blob, filename, blob.type || "image/png");
}

export async function downloadTextFile(
  content: string,
  filename: string,
  mimeType = "text/plain;charset=utf-8",
): Promise<{ ok: boolean; message?: string }> {
  return downloadBlob(new Blob([content], { type: mimeType }), filename, mimeType);
}
