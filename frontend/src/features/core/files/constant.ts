export const FILE_API_ROUTES = {
    createFile: "/files",
    updateFile: (id: string) => `/files/${id}`,
    uploadSQLFile: () => `/database/upload`,
    uploadAssets: () => `/upload/storage`,
    uploadChunkInit: () => `/upload/chunk/init`,
    uploadChunk: () => `/upload/chunk`,
    uploadChunkComplete: () => `/upload/chunk/complete`,
    fileLogsListOrDetails: (id?: string, query?: string) => `/filelogs${id ? `/${id}` : ""}${query ? `?${query}` : ""}`,
    fileLogsCreateOrUpdate: (id?: string) => `/filelogs${id ? `/${id}` : ""}`,
    fileLogsDelete: (id: string) => `/filelogs/delete/${id}`,
    fileLogsPreview: (id: string) => `/filelogs/preview/${id}`,
    fileCategoryAndTypes: () => `/filelogs-ct`,
    cancelProcessing: () => `/upload/processing/cancel`,
    retryProcessing: () => `/upload/processing/retry`,
    fileLogsSync: () => `/filelogs/sync`,
    fileLogsCreateFolder: () => `/filelogs/create-folder`,
    storageStats: () => `/filelogs/stats`
}

export const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB chunks (to stay under 100MB limit)