"use client";
import { FILE_API_ROUTES } from "./constant";
import { CHUNK_SIZE } from "./constant";

const API_BASE =
  process.env.NEXT_PUBLIC_UPLOAD_URL || process.env.NEXT_PUBLIC_API_URL;

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    credentials: "include",
  });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error: ${response.status}`);
  }
  
  return response.json();
}
 
const uploadAssets = async (formData: FormData): Promise<any> => {
  const response = await fetch(`${API_BASE}${FILE_API_ROUTES.uploadAssets()}`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  return response.json();
};

const initiateChunkUpload = async (
  fileName: string,
  fileSize: number,
  mimeType: string,
  category: string,
  isPublic: boolean,
  fileType: string,
  replace: boolean,
  folder?: string,
  parentId?: string
): Promise<{ uploadId: string }> => {
  const response = await fetchApi<any>(FILE_API_ROUTES.uploadChunkInit(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName, fileSize, mimeType, category, isPublic, type: fileType, replace, folder, parentId }),
  });
  // Backend returns { data: { uploadId, ... } }
  return response.data;
};

const uploadChunk = async (
  uploadId: string,
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number
): Promise<{ success: boolean; chunkIndex: number }> => {
  const formData = new FormData();
  formData.append("uploadId", uploadId);
  formData.append("chunk", chunk);
  formData.append("chunkIndex", String(chunkIndex));
  formData.append("totalChunks", String(totalChunks));
  console.log('UPLOAD BASE URL', API_BASE);
  const response = await fetch(`${API_BASE}${FILE_API_ROUTES.uploadChunk()}`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const result = await response.json();
  return result.data;
};

const completeChunkUpload = async (
  uploadId: string,
  fileName: string,
  category: string,
  fileType: string,
  isPublic: boolean
): Promise<any> => {
  const response = await fetchApi<any>(FILE_API_ROUTES.uploadChunkComplete(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uploadId, fileName, category, fileType, isPublic }),
  });
  return response.data;
};

export const chunkUploadFile = async (
  file: File,
  category: string,
  fileType: string,
  isPublic: boolean,
  onProgress: (progress: number) => void,
  replace: boolean = false,
  folder?: string,
  parentId?: string
): Promise<any> => {
  const fileSize = file.size;
  const fileName = file.name;
  const mimeType = file.type;

  // For files <= 50MB, use regular upload with simulated progress
  if (fileSize <= CHUNK_SIZE) {
    onProgress(10);
    const formData = new FormData();
    // Metadata fields must be BEFORE assets for Multer to read them during storage engine processing
    formData.append("category", category || "assets");
    formData.append("type", fileType || "unknown");
    formData.append("isPublic", isPublic ? "true" : "false");
    formData.append("replace", replace ? "true" : "false");
    if (folder) formData.append("folder", folder);
    if (parentId) formData.append("parentId", parentId);
    
    formData.append("assets", file);
    
    // Simulate progress during upload
    const progressInterval = setInterval(() => {
      onProgress(Math.min(90, (Date.now() % 1000) / 10 + 20));
    }, 200);

    try {
      const result = await uploadAssets(formData);
      clearInterval(progressInterval);
      onProgress(100);
      return result;
    } catch (error) {
      clearInterval(progressInterval);
      throw error;
    }
  }

  // For files > 50MB, try chunk upload (requires backend support)
  // Fallback to regular upload if chunk endpoints don't exist
  onProgress(5);
  
  try {
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    const initResponse = await initiateChunkUpload(fileName, fileSize, mimeType, category, isPublic, fileType, replace, folder, parentId);
    const uploadId = initResponse.uploadId;
    
    console.log('🚀 Chunk upload initialized:', { 
      uploadId, 
      fileName, 
      totalChunks,
      fileSize 
    });
    
    onProgress(10);

    let uploadedBytes = 0;

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = file.slice(start, end);

      console.log(`⬆️ Uploading chunk ${chunkIndex + 1}/${totalChunks}...`);
      
      try {
        await uploadChunk(uploadId, chunk, chunkIndex, totalChunks);
      } catch (chunkError: any) {
        console.error(`❌ Chunk ${chunkIndex} upload failed:`, chunkError.message);
        throw new Error(`Chunk ${chunkIndex} upload failed: ${chunkError.message}`);
      }

      uploadedBytes = end;
      const progress = Math.min(10 + Math.round((uploadedBytes / fileSize) * 90), 99);
      console.log(`✓ Chunk ${chunkIndex + 1} uploaded. Progress: ${progress}%`);
      onProgress(progress);
    }

    console.log('✅ All chunks uploaded. Completing...');
    onProgress(99);
    
    const result = await completeChunkUpload(uploadId, fileName, category, fileType, isPublic);
    console.log('🎉 Upload complete:', result);
    onProgress(100);
    return result;
  } catch (error: any) {
    // If chunk upload fails, fall back to regular upload
    console.warn("⚠️ Chunk upload failed, falling back to regular upload:", error.message);
    onProgress(10);
    
    const formData = new FormData();
    formData.append("category", category || "assets");
    formData.append("type", fileType || "unknown");
    formData.append("isPublic", isPublic ? "true" : "false");
    formData.append("replace", replace ? "true" : "false");
    if (folder) formData.append("folder", folder);
    if (parentId) formData.append("parentId", parentId);
    
    formData.append("assets", file);
    
    const progressInterval = setInterval(() => {
      onProgress(Math.min(90, (Date.now() % 1000) / 10 + 20));
    }, 200);

    try {
      const result = await uploadAssets(formData);
      clearInterval(progressInterval);
      onProgress(100);
      return result;
    } catch (uploadError) {
      clearInterval(progressInterval);
      throw uploadError;
    }
  }
};

export { uploadAssets };
