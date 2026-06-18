"use server";
import { apiClient } from "@/lib/restapi/apiClient";
import { AxiosResponse } from "axios";
import { FILE_API_ROUTES } from "./constant";
import { handleApiError } from "@/common/exceptions/handleApiError";
import { CommonListResponse, CommonResponse, PaginationParams } from "@/common/interface/interface";

const API_ROUTES = FILE_API_ROUTES;

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks

const uploadSQLFile = async (formData: FormData): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(API_ROUTES.uploadSQLFile(), formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const uploadAssets = async (formData: FormData): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(API_ROUTES.uploadAssets(), formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const fileLogsListOrDetails = async (id?: string, paginationParams?: PaginationParams, query?: string): Promise<CommonListResponse | CommonResponse> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(API_ROUTES.fileLogsListOrDetails(id, query), { params: paginationParams });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const fileLogsCreateOrUpdate = async (id?: string, data?: any): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(API_ROUTES.fileLogsCreateOrUpdate(id), data);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const fileLogsDelete = async (id: string): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.delete<any>(API_ROUTES.fileLogsDelete(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const fileLogsPreview = async (id: string): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(API_ROUTES.fileLogsPreview(id));
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const fetchFileLogsCatTypes = async (): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(API_ROUTES.fileCategoryAndTypes());
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
}

const initiateChunkUpload = async (
  fileName: string,
  fileSize: number,
  mimeType: string,
  category: string,
  isPublic: boolean,
  folder?: string
): Promise<{ uploadId: string }> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(
      API_ROUTES.uploadChunkInit(),
      {
        fileName,
        fileSize,
        mimeType,
        category,
        isPublic,
        folder,
      }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const uploadChunk = async (
  uploadId: string,
  chunk: Blob,
  chunkIndex: number,
  totalChunks: number
): Promise<{ success: boolean; chunkIndex: number }> => {
  try {
    const formData = new FormData();
    formData.append("uploadId", uploadId);
    formData.append("chunk", chunk);
    formData.append("chunkIndex", String(chunkIndex));
    formData.append("totalChunks", String(totalChunks));

    const res: AxiosResponse<any> = await apiClient.post<any>(
      API_ROUTES.uploadChunk(),
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const completeChunkUpload = async (
  uploadId: string,
  fileName: string,
  category: string,
  fileType: string,
  isPublic: boolean,
  folder?: string
): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(
      API_ROUTES.uploadChunkComplete(),
      {
        uploadId,
        fileName,
        category,
        fileType,
        isPublic,
        folder,
      }
    );
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const cancelProcessing = async (fileId: string): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(API_ROUTES.cancelProcessing(), { fileId });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const retryProcessing = async (fileId: string): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(API_ROUTES.retryProcessing(), { fileId });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const chunkUploadFile = async (
  file: File,
  category: string,
  fileType: string,
  isPublic: boolean,
  onProgress: (progress: number) => void,
  replace: boolean,
  folder?: string
): Promise<any> => {
  const fileSize = file.size;
  const fileName = file.name;
  const mimeType = file.type;

  if (fileSize <= CHUNK_SIZE) {
    onProgress(10);
    const formData = new FormData();
    formData.append("assets", file);
    formData.append("category", category || "assets");
    formData.append("type", fileType || "unknown");
    formData.append("isPublic", isPublic ? "true" : "false");
    onProgress(50);
    const result = await uploadAssets(formData);
    onProgress(100);
    return result;
  }

  onProgress(5);
  const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
  const initResponse = await initiateChunkUpload(fileName, fileSize, mimeType, category, isPublic, folder);
  const uploadId = initResponse.uploadId;
  onProgress(10);

  let uploadedBytes = 0;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, fileSize);
    const chunk = file.slice(start, end);

    await uploadChunk(uploadId, chunk, chunkIndex, totalChunks);

    uploadedBytes = end;
    const progress = Math.min(10 + Math.round((uploadedBytes / fileSize) * 90), 99);
    onProgress(progress);
  }

  onProgress(99);
  const result = await completeChunkUpload(uploadId, fileName, category, fileType, isPublic, folder);
  onProgress(100);
  return result;
};

const fileLogsSync = async (category: string, folder?: string, bucket?: string): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(API_ROUTES.fileLogsSync(), { category, folder, bucket });
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const fileLogsCreateFolder = async (data: { name: string, parentId?: string, category: string, isPublic?: boolean }): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.post<any>(API_ROUTES.fileLogsCreateFolder(), data);
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const fileLogsSyncAll = async (): Promise<any> => {
  try {
    const response = await apiClient.post(API_ROUTES.fileLogsSync().replace('/sync', '/sync-all'));
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

const fileLogsGetStats = async (): Promise<any> => {
  try {
    const res: AxiosResponse<any> = await apiClient.get<any>(API_ROUTES.storageStats());
    return res.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export { 
  fileLogsListOrDetails, 
  fileLogsCreateOrUpdate, 
  fileLogsDelete, 
  fileLogsPreview, 
  fetchFileLogsCatTypes, 
  cancelProcessing, 
  retryProcessing, 
  fileLogsSync,
  fileLogsSyncAll,
  fileLogsCreateFolder,
  fileLogsGetStats
};
export { uploadSQLFile, uploadAssets };
