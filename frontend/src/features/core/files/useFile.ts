"use client";

import { useRequest } from "ahooks";
import * as UseCases from "./query";
import { chunkUploadFile, uploadAssets } from "./clientUpload";
import { PaginationParams } from "@/common/interface/interface";

export const useFile = () => {
  const {
    data: uploadSuccessResponse,
    loading: loading,
    error: error,
    runAsync: uploadSQLFile,
    refreshAsync: refreshProgramsItems,
  } = useRequest((formData: FormData) => UseCases.uploadSQLFile(formData), {
    manual: true,
    debounceWait: 100,
  });

  return {
    uploadSuccessResponse,
    loading,
    error,
    uploadSQLFile,
  };
};

export const useFileAssets = () => {
  const {
    data: uploadAssetsResponse,
    loading: loadingAssets,
    error: errorAssets,
    runAsync: uploadAssetsFn,
    refreshAsync: refreshAssetsItems,
  } = useRequest((formData: FormData) => uploadAssets(formData), {
    manual: true,
    debounceWait: 100,
  });

  return {
    uploadAssetsResponse,
    loadingAssets,
    errorAssets,
    uploadAssets: uploadAssetsFn,
  };
};

export const useChunkUpload = () => {
  const {
    loading: chunkUploading,
    error: chunkUploadError,
    runAsync: chunkUpload,
  } = useRequest(
    (file: File, category: string, fileType: string, isPublic: boolean, onProgress: (progress: number) => void, replace: boolean, folder?: string, parentId?: string) =>
      chunkUploadFile(file, category, fileType, isPublic, onProgress, replace, folder, parentId),
    {
      manual: true,
    }
  );

  return {
    chunkUploading,
    chunkUploadError,
    chunkUpload,
  };
};

export const useFileLogs = (params: PaginationParams = { page: 1 }) => {
  const {
    data: fileLogsResponse,
    loading: loadingFileLogs,
    error: errorFileLogs,
    runAsync: fetchLogsListOrDetails,
    refreshAsync: refreshFileLogsItems,
  } = useRequest((id?: string, fetchParams: PaginationParams = params, query?: string) => UseCases.fileLogsListOrDetails(id, fetchParams, query), {
    manual: true,
    debounceWait: 100,
  });

  const {
    data: fileCategoryAndTypesResponse,
    loading: loadingFileCT,
    error: errorFileCT,
    runAsync: fetchCategoryAndTypes,
    refreshAsync: refreshFetchCategoryAndTypes,
  } = useRequest(() => UseCases.fetchFileLogsCatTypes(), {
    manual: true,
    debounceWait: 100,
  });

  const { runAsync: fileLogsCreateOrUpdate } = useRequest((id?: string, data?: any) => UseCases.fileLogsCreateOrUpdate(id, data), {
    manual: true,
    debounceWait: 100,
  });

  const { runAsync: fileLogsDelete } = useRequest((id: string) => UseCases.fileLogsDelete(id), {
    manual: true,
    debounceWait: 100,
  });

  const { runAsync: fileLogsPreview } = useRequest((id: string) => UseCases.fileLogsPreview(id), {
    manual: true,
    debounceWait: 100,
  });

  const { runAsync: cancelProcessing } = useRequest((fileId: string) => UseCases.cancelProcessing(fileId), {
    manual: true
  });

  const { runAsync: retryProcessing } = useRequest((fileId: string) => UseCases.retryProcessing(fileId), {
    manual: true
  });

  const { loading: loadingSync, runAsync: fileLogsSync } = useRequest((category: string, folder?: string, bucket?: string) => UseCases.fileLogsSync(category, folder, bucket), {
    manual: true
  });

  const { loading: loadingSyncAll, runAsync: fileLogsSyncAll } = useRequest(() => UseCases.fileLogsSyncAll(), {
    manual: true
  });

  const { runAsync: fileLogsCreateFolder } = useRequest((data: { name: string, parentId?: string, category: string, isPublic?: boolean }) => UseCases.fileLogsCreateFolder(data), {
    manual: true
  });

  const { data: storageStats, loading: loadingStats, runAsync: fetchFileLogStats } = useRequest(() => UseCases.fileLogsGetStats(), {
    manual: true,
  });

  // Return the necessary data and functions
  return {
    fileLogsResponse,
    loadingFileLogs,
    errorFileLogs,
    fetchLogsListOrDetails,
    fileLogsCreateOrUpdate,
    fileLogsDelete,
    fileLogsPreview,
    fileCategoryAndTypesResponse,
    fetchCategoryAndTypes,
    loadingFileCT,
    errorFileCT,
    cancelProcessing,
    retryProcessing,
    fileLogsSync,
    loadingSync,
    fileLogsSyncAll,
    loadingSyncAll,
    fileLogsCreateFolder,
    storageStats,
    loadingStats,
    fetchFileLogStats
  };
};
