import { FolderOutlined } from "@ant-design/icons";
import { ImageIcon, MusicIcon, VideoIcon, FileIcon, FileTextIcon } from "lucide-react";
import { resolveStorageFileUrl } from "@/utils/storageUrl";

export const getFileIcon = (type: string, mimetype: string) => {
  if (type === "folder") return FolderOutlined;
  if (type === "image" || mimetype?.startsWith("image/")) return ImageIcon;
  if (type === "audio" || mimetype?.startsWith("audio/")) return MusicIcon;
  if (type === "video" || mimetype?.startsWith("video/")) return VideoIcon;
  if (mimetype?.includes("pdf") || mimetype?.includes("document") || mimetype?.includes("text")) return FileTextIcon;
  return FileIcon;
};

export const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const getFileTypeFromMime = (mimetype: string, fileName?: string) => {
  if (mimetype.startsWith("image/")) return "image";
  if (mimetype.startsWith("audio/")) return "audio";
  if (mimetype.startsWith("video/")) return "video";
  
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const videoExts = ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'];
    const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'];
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
    
    if (videoExts.includes(ext || '')) return "video";
    if (audioExts.includes(ext || '')) return "audio";
    if (imageExts.includes(ext || '')) return "image";
  }

  if (mimetype.includes("pdf") || mimetype.includes("document") || mimetype.includes("text")) return "document";
  return "document";
};

/**
 * Resolve a stored file URL against the backend's MinIO storage proxy.
 * Direct MinIO/CDN URLs are converted — never returned as-is.
 */
export const getFullUrl = (url: string | undefined, bucket?: string) =>
  resolveStorageFileUrl(url, { bucket, isPublic: bucket !== "private" });
