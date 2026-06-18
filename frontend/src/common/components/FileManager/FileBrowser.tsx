"use client";
import React, { useState, useMemo, useRef, useEffect } from "react";
import { 
  SearchIcon, GridIcon, ListIcon, PlusIcon, UploadIcon, EyeIcon, EditIcon, 
  TrashIcon, XIcon, CheckIcon, MusicIcon, VideoIcon, ImageIcon, 
  FolderIcon, ChevronRight, ChevronLeft, RefreshCw, MoreVertical, Copy, Move, Download
} from "lucide-react";
import { 
  Button, Input, Select, Card, Avatar, Progress, Tag, Divider, Empty, 
  Modal as AntModal, Space, Row, Col, Pagination, Switch, 
  Breadcrumb, Checkbox, Layout, Menu, Typography, Table, Tooltip, Dropdown, App,
  Drawer, Radio, theme
} from "antd";
import { 
  DatabaseIcon, HardDriveIcon, CloudDownloadIcon
} from "lucide-react";
import { 
  ReloadOutlined, FolderOutlined, EyeOutlined, DownloadOutlined, 
  DeleteOutlined, EditOutlined, FolderAddOutlined, AppstoreOutlined, 
  UnorderedListOutlined, CloudUploadOutlined, MoreOutlined, SyncOutlined,
  CopyOutlined, ScissorOutlined, RotateLeftOutlined,
  InfoCircleOutlined, ShareAltOutlined as ShareIcon,
  PlayCircleOutlined, FileOutlined, BarsOutlined, SyncOutlined as SyncIcon
} from "@ant-design/icons";
import { FileLog } from "@/types";
import { useFileAssets, useFileLogs, useChunkUpload } from "@/features/core/files/useFile";
import HlsPlayer from "./HlsPlayer";
import { CHUNK_SIZE } from "@/features/core/files/constant";
import { PaginationParams } from "@/common/interface/interface";
import _ from "lodash";
import { GridShimmer, ListShimmer } from "./Shimmer";
import { getFileIcon, formatFileSize, getFileTypeFromMime, getFullUrl } from "./FileManagerUtils";
import dayjs from "dayjs";

const { Text, Title } = Typography;
const { Content } = Layout;

interface UploadFile {
  id: string;
  file: File;
  preview?: string;
  previewUrl?: string;
  type: string;
  category?: string;
  uploading: boolean;
  progress: number;
  error?: string;
  renameMode?: boolean;
  newName?: string;
  isPublic?: boolean;
  replace?: boolean;
  parentId?: string;
  folder?: string;
}

interface PathHistoryItem {
  id: string | null;
  name: string;
  page?: number;
}

export interface FileBrowserProps {
  mode?: "page" | "picker";
  onSelect?: (files: FileLog[]) => void;
  multiple?: boolean;
  fileTypes?: string[];
  initialSelectedFiles?: string[];
  headerExtra?: React.ReactNode;
  footerExtra?: React.ReactNode;
  refreshKey?: number;
  processingFiles?: Record<string, { progress: number, message: string, status: string }>;
  onShowLogs?: (fileId: string) => void;
  onData?: (data: any) => void;
}

const FileBrowser: React.FC<FileBrowserProps> = ({
  mode = "page",
  onSelect,
  multiple = false,
  fileTypes = [],
  initialSelectedFiles = [],
  headerExtra,
  footerExtra,
  refreshKey = 0,
  processingFiles,
  onShowLogs,
  onData
}) => {
  const { message: antMessage, modal } = App.useApp();
  const { token } = theme.useToken();
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortField, setSortField] = useState<string>("fileName");
  const [sortOrder, setSortOrder] = useState<string | null>("ascend");
  const [currentBucket, setCurrentBucket] = useState<string | null>(null);
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [pathHistory, setPathHistory] = useState<PathHistoryItem[]>([]);
  
  const [typeFilter, setTypeFilter] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [internalSelectedFiles, setInternalSelectedFiles] = useState<string[]>(initialSelectedFiles);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileLog | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [renamingFile, setRenamingFile] = useState<FileLog | null>(null);
  const [newName, setNewName] = useState("");
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showDetails, setShowDetails] = useState(false);
  const [selectedFileForDetails, setSelectedFileForDetails] = useState<FileLog | null>(null);
  const [isNewFolderPublic, setIsNewFolderPublic] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mergeCategory, setMergeCategory] = useState<string[]>([]);
  const [pendingJobs, setPendingJobs] = useState<any[]>([]);

  const [pagination, setPagination] = useState<PaginationParams>({
    page: 1,
    limit: mode === "page" ? 50 : 100,
    total: 0,
  });

  const setPage = (page: number) => setPagination(prev => ({ ...prev, page }));
  const page = pagination.page;

  const { uploadAssets, loadingAssets } = useFileAssets();
  const { 
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
  } = useFileLogs();
  const { chunkUpload } = useChunkUpload();

  const fetchFiles = () => {
    if (!currentBucket) return;
    
    const paramsObj: any = {
      page: pagination.page,
      limit: pagination.limit,
      category: currentBucket,
      parentId: currentParentId || "root",
      sort_by: sortField,
      order_by: sortOrder === 'descend' ? 'desc' : 'asc'
    };
    if (!_.isEmpty(searchTerm)) paramsObj.fileName = searchTerm;
    if (!_.isEmpty(typeFilter)) paramsObj.mimeType = typeFilter;

    const query = new URLSearchParams(paramsObj).toString();
    fetchLogsListOrDetails(undefined, { page: pagination.page, limit: pagination.limit }, query);
  };

  useEffect(() => {
    fetchCategoryAndTypes().then((response: any) => {
      const cats = response?.data?.categories || [];
      setMergeCategory([...cats]);
    });
  }, []);

  useEffect(() => {
    if (currentBucket) {
      fetchFiles();
    }
  }, [searchTerm, currentBucket, currentParentId, typeFilter, pagination.limit, pagination.page, refreshKey, sortField, sortOrder]);

  useEffect(() => {
    if (!currentBucket && mode === 'page') {
      fetchFileLogStats();
    }
    if (currentBucket === 'public') {
      setIsNewFolderPublic(true);
    } else {
      setIsNewFolderPublic(false);
    }
  }, [currentBucket, mode, refreshKey]);

  useEffect(() => {
    if (fileLogsResponse && onData) {
      onData(fileLogsResponse);
    }
  }, [fileLogsResponse, onData]);

  const currentFolderPath = useMemo(() => {
    if (pathHistory.length <= 1) return "";
    return pathHistory.slice(1).map(h => h.name).join("/");
  }, [pathHistory]);

  const currentMinioBucket = useMemo(() => {
    if (!currentBucket) return null;
    const bucketInfo = fileCategoryAndTypesResponse?.data?.buckets?.find((b: any) => 
      b.categories.includes(currentBucket)
    );
    return bucketInfo?.name || null;
  }, [fileCategoryAndTypesResponse, currentBucket]);

  const files = useMemo(() => {
    let dbFiles: any[] = [];
    if (fileLogsResponse) {
      dbFiles = ((fileLogsResponse as any)?.data || []).map((f: any) => ({
        ...f,
        filename: f.fileName, 
      }));
    }

    // Filter pending jobs for current folder/bucket
    const currentFolderJobs = pendingJobs.filter(job => 
      job.folder === currentFolderPath && job.category === currentBucket
    ).map(job => ({
      ...job,
      id: job.trackingId, // Link with processingFiles which uses trackingId
      isVirtual: true,
      fileName: job.fileName,
      lastModified: new Date().toISOString(),
      size: job.size,
      status: 'processing'
    }));

    // Clean up finished jobs that are now in DB
    const finalFiles = [...dbFiles];
    currentFolderJobs.forEach(job => {
      const dbMatch = dbFiles.find(f => f.fileName === job.fileName || f.fileName === job.fileName.replace(/\.[^/.]+$/, ""));
      if (!dbMatch) {
        finalFiles.unshift(job);
      }
    });

    return finalFiles;
  }, [fileLogsResponse, pendingJobs, currentFolderPath, currentBucket]);
  
  // Handle data updates: cleanup pending jobs and update pagination
  useEffect(() => {
    if (fileLogsResponse) {
      const total = (fileLogsResponse as any)?.meta?.totalRows || 0;
      setPagination(prev => prev.total !== total ? { ...prev, total } : prev);
      
      const dbFiles = (fileLogsResponse as any)?.data || [];
      if (pendingJobs.length > 0) {
        const nextPending = pendingJobs.filter(job => 
          !dbFiles.find((f: any) => 
            f.fileName === job.fileName || 
            f.fileName === job.fileName.replace(/\.[^/.]+$/, "")
          )
        );
        
        if (nextPending.length !== pendingJobs.length) {
          setPendingJobs(nextPending);
        }
      }
    }
  }, [fileLogsResponse, refreshKey]);

  // Cleanup uploadFiles when processing is complete
  useEffect(() => {
    if (uploadFiles.length > 0 && processingFiles) {
      const finishedIds = uploadFiles
        .filter(uf => {
          const tId = (uf as any).trackingId;
          return tId && processingFiles[tId] && processingFiles[tId].progress === 100;
        })
        .map(uf => uf.id);

      if (finishedIds.length > 0) {
        // Wait a bit before removing so user can see it's done
        const timer = setTimeout(() => {
          setUploadFiles(prev => prev.filter(uf => !finishedIds.includes(uf.id)));
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [uploadFiles, processingFiles]);

  const categoryOptions = useMemo(() => {
    const apiCategories = fileCategoryAndTypesResponse?.data?.categories || [];
    const userAddedCategories = mergeCategory.filter((item: any) => !apiCategories.includes(item));
    return [
      ...apiCategories.map((c: any) => ({ label: c, value: c })),
      ...userAddedCategories.map((c: any) => ({ label: c, value: c }))
    ];
  }, [fileCategoryAndTypesResponse?.data?.categories, mergeCategory]);

  const handleTableChange = (pagination: any, filters: any, sorter: any) => {
    setSortField(sorter.field || 'fileName');
    setSortOrder(sorter.order);
  };

  const handleFileToggle = (fileId: string) => {
    if (multiple) {
      setInternalSelectedFiles(prev => (prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]));
    } else {
      setInternalSelectedFiles([fileId]);
    }
  };

  const handlePreview = async (file: FileLog) => {
    // Allow previewing folders if they are media folders (HLS)
    if (file.isFolder && file.type !== 'audio' && file.type !== 'video') return;
    try {
      const res = await fileLogsPreview(file.id);
      if (res?.data?.url) {
        setPreviewFile({ ...file, url: res.data.url });
        setShowPreview(true);
      }
    } catch (error) {
      antMessage.error("Failed to load preview");
    }
  };

  const isPreviewable = (file: FileLog) => {
    const ext = file.fileName.split('.').pop()?.toLowerCase() || '';
    return ['mp3', 'mp4', 'm4a', 'wav', 'webp', 'jpg', 'jpeg', 'png', 'gif'].includes(ext) || file.type === 'audio' || file.type === 'video';
  };

  const renderPreviewContent = () => {
    if (!previewFile) return null;
    const { url, fileName, type, mimeType, isFolder } = previewFile;
    if (!url && !isFolder) return null; // Folders might not have a URL in the DB

    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const isImage = type === 'image' || mimeType?.startsWith('image/') || ['webp', 'jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext);
    const isMedia = type === 'audio' || type === 'video' || mimeType?.startsWith('audio/') || mimeType?.startsWith('video/');
    
    if (isMedia) {
      // Construction of media URL
      let mediaUrl = url;
      
      // If no URL (common for folders), use the path/folder property
      if (!mediaUrl && isFolder) {
        mediaUrl = (previewFile as any).folder || (previewFile as any).path;
      }

      let finalMediaUrl = getFullUrl(mediaUrl, previewFile.bucket);

      // Smart HLS detection: if it's a folder, it's definitely HLS.
      // If it's a file, it might be HLS if it ends in .m3u8, otherwise it's raw.
      const isHls = isFolder || finalMediaUrl.includes('.m3u8');

      if (isHls && !finalMediaUrl.endsWith('.m3u8')) {
        // Ensure trailing slash and add playlist.m3u8
        finalMediaUrl = `${finalMediaUrl.endsWith('/') ? finalMediaUrl : finalMediaUrl + '/'}playlist.m3u8`;
      }

      return (
        <div style={{ width: '100%', maxWidth: 800 }}>
          <HlsPlayer 
            url={finalMediaUrl} 
            type={(type === 'video' || (mimeType && mimeType.startsWith('video/'))) ? 'video' : 'audio'} 
          />
        </div>
      );
    }
    
    if (isImage) {
      return (
        <div style={{ textAlign: 'center' }}>
          <img 
            src={getFullUrl(url, previewFile.bucket)} 
            alt={fileName} 
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} 
          />
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">{fileName}</Text>
          </div>
        </div>
      );
    }
    
    return (
      <Empty 
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space orientation="vertical">
            <Text>Preview not supported for this file type</Text>
            <Button type="link" onClick={() => window.open(getFullUrl(url, previewFile.bucket), '_blank')}>
              Download to view
            </Button>
          </Space>
        } 
      />
    );
  };

  const handleBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      const last = newHistory[newHistory.length - 1];
      setPathHistory(newHistory);
      setCurrentParentId(last.id);
      setPage(last.page || 1);
    } else if (pathHistory.length === 1) {
      setCurrentBucket(null);
      setCurrentParentId(null);
      setPathHistory([]);
      setPage(1);
    }
  };

  const handleFolderClick = (folder: any) => {
    if (folder.isFolder) {
      setPathHistory(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1].page = page;
        }
        return [...updated, { id: folder.id, name: folder.fileName, page: 1 }];
      });
      setCurrentParentId(folder.id);
      setPage(1);
    } else {
      onSelect?.([folder]);
    }
  };

  const handleBreadcrumbClick = (item: PathHistoryItem, index: number) => {
    if (index === -1) {
      setCurrentBucket(null);
      setCurrentParentId(null);
      setPathHistory([]);
      setPage(1);
      return;
    }

    setPathHistory(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1].page = page;
      }
      return updated.slice(0, index + 1);
    });
    
    setCurrentParentId(item.id);
    setPage(item.page || 1);
  };

  const handleBucketClick = (bucketName: string) => {
    setCurrentBucket(bucketName);
    setCurrentParentId(null);
    setPathHistory([{ id: null, name: bucketName, page: 1 }]);
    setPage(1);
  };

  const handleGoBack = () => {
    if (pathHistory.length <= 1) {
      handleBreadcrumbClick({id: null, name: ""}, -1);
    } else {
      const parentIdx = pathHistory.length - 2;
      handleBreadcrumbClick(pathHistory[parentIdx], parentIdx);
    }
  };

  const handleFileSelect = (files: FileList | null, forcedType?: string) => {
    if (!files) return;
    const filesToProcess = Array.from(files);
    const newUploadFiles: UploadFile[] = filesToProcess.map((file) => {
      const previewUrl = file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined;
      return {
        id: `upload-${Date.now()}-${Math.random()}`,
        file,
        category: currentBucket || "assets",
        parentId: currentParentId || undefined,
        folder: currentFolderPath,
        uploading: false,
        progress: 0,
        isPublic: currentBucket === 'public',
        preview: previewUrl,
        previewUrl,
        type: forcedType || file.type,
      };
    });
    setUploadFiles((prev) => [...prev, ...newUploadFiles]);
    setIsUploadModalOpen(true);
  };

  const handleUploadFile = async (uploadFile: UploadFile) => {
    setUploadFiles((prev) => prev.map((uf) => (uf.id === uploadFile.id ? { ...uf, uploading: true, progress: 0 } : uf)));
    try {
      const fileType = getFileTypeFromMime(uploadFile.type, uploadFile.file.name) || "unknown";
      const category = uploadFile.category || "assets";

      let result: any;
      // Always use chunkUpload (mapped to chunkUploadFile) as it handles progress simulation for small files
      // and chunked transfer for large files automatically.
      result = await chunkUpload(uploadFile.file, category, fileType, uploadFile.isPublic || false, (progress) => {
        setUploadFiles((prev) => prev.map((uf) => (uf.id === uploadFile.id ? { ...uf, progress } : uf)));
      }, uploadFile.replace || false, uploadFile.folder, uploadFile.parentId || undefined);
        
      let trackingId: string | undefined;
      if (result?.data?.processing) {
        trackingId = result.data.trackingId;
        setPendingJobs(prev => [...prev, {
          trackingId,
          fileName: uploadFile.file.name,
          size: uploadFile.file.size,
          type: fileType,
          category: category,
          folder: uploadFile.folder,
          isPublic: uploadFile.isPublic
        }]);
      }

      fetchFiles();
      setUploadFiles((prev) => {
        // If it's a processing job, keep it in the list but update it with trackingId
        if (trackingId) {
          return prev.map(uf => uf.id === uploadFile.id ? { ...uf, uploading: true, trackingId } as any : uf);
        }
        
        const filtered = prev.filter((uf) => uf.id !== uploadFile.id);
        if (filtered.length === 0) setIsUploadModalOpen(false);
        return filtered;
      });
    } catch (error) {
      setUploadFiles((prev) => prev.map((uf) => (uf.id === uploadFile.id ? { ...uf, uploading: false, error: "Upload failed" } : uf)));
    }
  };

  const handleDelete = (id: string) => {
    modal.confirm({
      title: "Delete Item",
      content: "Are you sure you want to delete this item? If it's a folder, all contents will be removed.",
      okText: "Delete",
      okType: "danger",
      onOk: async () => {
        try {
          await fileLogsDelete(id);
          antMessage.success("Deleted successfully");
          fetchFiles();
        } catch (error) {
          antMessage.error("Failed to delete");
        }
      }
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentBucket) return;
    try {
      await fileLogsCreateFolder({
        name: newFolderName,
        parentId: currentParentId || undefined,
        category: currentBucket as string,
        isPublic: isNewFolderPublic
      });
      antMessage.success("Folder created");
      setIsNewFolderModalOpen(false);
      setNewFolderName("");
      fetchFiles();
    } catch (error) {
      antMessage.error("Failed to create folder");
    }
  };

  const handleSyncBucket = async () => {
    fetchFiles();
  };

  const handleForceSync = async (category: string | undefined, folder?: string) => {
    if (!category) return;
    const folderToSync = folder || currentFolderPath;
    const displayPath = folderToSync ? `${category}/${folderToSync}` : category;
    const hide = antMessage.loading(`Force syncing ${displayPath} from source...`, 0);
    try {
      await fileLogsSync(category, folderToSync, currentMinioBucket || undefined);
      antMessage.success("Sync completed");
      fetchFiles();
    } catch (error) {
      antMessage.error("Sync failed");
    } finally {
      hide();
    }
  };

  const saveRename = async () => {
    if (!newName.trim() || !renamingFile) return;
    try {
      await fileLogsCreateOrUpdate(renamingFile.id, { fileName: newName });
      antMessage.success("Renamed successfully");
      setRenamingFile(null);
      fetchFiles();
    } catch (error) {
      antMessage.error("Failed to rename");
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'fileName',
      key: 'fileName',
      sorter: true,
      sortOrder: sortField === 'fileName' ? sortOrder : null,
      render: (text: string, record: any) => {
        const FileIcon = record.isFolder ? FolderIcon : getFileIcon(record.type, record.mimeType);
        return (
          <Space onClick={(e) => {
            if (record.isFolder) {
              e.stopPropagation();
              handleFolderClick(record);
            }
          }} style={{ cursor: 'pointer' }}>
            {record.mimeType?.startsWith("image/") ? (
              <img 
                src={getFullUrl(record.url, record.bucket)} 
                style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover' }} 
                alt=""
                onError={(e) => {
                  (e.target as HTMLImageElement).src = ""; // Fallback to icon if image fails
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <FileIcon size={18} color={record.isFolder ? "#faad14" : "#bfbfbf"} fill={record.isFolder ? "#faad14" : "none"} />
            )}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Space size={4}>
                <Text style={{ color: token.colorText }}>{text}</Text>
                {record.isVirtual && <SyncOutlined spin style={{ color: token.colorPrimary, fontSize: 12 }} />}
              </Space>
              {(processingFiles && processingFiles[record.id]) && (
                <div style={{ width: 160, marginTop: 4 }}>
                  <Progress 
                    percent={processingFiles[record.id].progress} 
                    size="small" 
                    status={processingFiles[record.id].status === 'error' ? 'exception' : 'active'}
                    strokeColor={processingFiles[record.id].status === 'error' ? token.colorError : token.colorSuccess}
                    format={(p) => <span style={{ fontSize: 10, color: token.colorTextTertiary }}>{p}%</span>}
                  />
                  {processingFiles[record.id].message && (
                    <Text style={{ fontSize: 9, color: processingFiles[record.id].status === 'error' ? token.colorError : token.colorTextTertiary, display: 'block', maxWidth: 160 }} ellipsis>
                      {processingFiles[record.id].message}
                    </Text>
                  )}
                </div>
              )}
            </div>
          </Space>
        );
      }
    },
    {
      title: 'Access',
      dataIndex: 'isPublic',
      key: 'isPublic',
      width: 100,
      render: (isPublic: boolean) => (
        <Tag color={isPublic ? "green" : "blue"} style={{ borderRadius: 4, fontSize: 11 }}>
          {isPublic ? "PUBLIC" : "PRIVATE"}
        </Tag>
      )
    },
    {
      title: 'Last Modified',
      dataIndex: 'lastModified',
      key: 'lastModified',
      sorter: true,
      sortOrder: sortField === 'lastModified' ? sortOrder : null,
      render: (date: any) => <Text style={{ color: token.colorTextSecondary }}>{date ? dayjs(date).format('ddd, MMM D YYYY HH:mm') : '-'}</Text>
    },
    {
      title: 'Size',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      sorter: true,
      sortOrder: sortField === 'size' ? sortOrder : null,
      align: 'right' as const,
      render: (size: number, record: any) => <Text style={{ color: token.colorTextSecondary }}>{record.isFolder ? '-' : formatFileSize(size)}</Text>
    },
     {
      title: '',
      key: 'actions',
      width: mode === 'picker' ? 120 : 50,
      render: (_: any, record: any) => (
        <Space>
          {mode === 'picker' && (!record.isFolder || record.type === 'audio' || record.type === 'video') && (
            <Button 
              type="primary" 
              size="small"
              icon={<CheckIcon size={14} />}
              onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect([record]);
              }}
              style={{ fontSize: 12, borderRadius: 4 }}
            >
              SELECT
            </Button>
          )}
          <Dropdown 
            menu={{
              items: [
                { key: 'preview', label: 'Preview', icon: <EyeOutlined />, onClick: () => handlePreview(record), disabled: record.isFolder && record.type !== 'audio' && record.type !== 'video' },
                { key: 'download', label: 'Download', icon: <DownloadOutlined />, onClick: () => window.open(record.url, '_blank'), disabled: record.isFolder },
                mode === 'picker' ? { key: 'select', label: 'Select', icon: <CheckIcon size={16} />, onClick: () => onSelect && onSelect([record]), disabled: record.isFolder && record.type !== 'audio' && record.type !== 'video' } : { key: 'rename', label: 'Rename', icon: <EditOutlined />, onClick: () => { setRenamingFile(record); setNewName(record.fileName); } },
                { key: 'resync', label: 'Resync Source', icon: <SyncOutlined />, onClick: () => handleForceSync(record.category) },
                { type: 'divider' },
                { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(record.id) },
              ]
            }}
            trigger={['click']}
          >
            <Button 
              type="text" 
              icon={<MoreVertical size={16} />} 
              style={{ color: token.colorTextSecondary }} 
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </Space>
      )
    }
  ];

  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });

  const handleGlobalContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
    setContextMenuVisible(true);
  };


  const handleSyncAll = async () => {
    modal.confirm({
      title: "Sync All Storages",
      content: "This will clear all logs in the database and re-sync everything from MinIO. Are you sure?",
      okText: "Resync All",
      okType: "danger",
      onOk: async () => {
        try {
          const hide = antMessage.loading("Deep syncing all storages...", 0);
          await fileLogsSyncAll();
          hide();
          antMessage.success("All storages re-synced successfully");
          fetchCategoryAndTypes();
        } catch (error) {
          antMessage.error("Sync failed");
        }
      }
    });
  };

  const renderContent = () => {
    if (!currentBucket) {
      if (loadingFileCT || loadingStats) return <GridShimmer />;
      
      const stats = storageStats?.data;
      const categories = _.uniq([...(fileCategoryAndTypesResponse?.data?.categories || []), ...mergeCategory]);

      return (
        <div style={{ padding: mode === 'picker' ? '12px' : '24px' }}>
          {mode === 'page' && stats &&
            <div style={{ marginBottom: 24 }}>
              <Title level={5} style={{ marginBottom: 16, fontWeight: 500 }}>STORAGE OVERVIEW</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10 }} styles={{ body: { padding: 16 } }}>
                    <Space orientation="vertical" style={{ width: '100%' }} size={4}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13 }}>FileLog Storage</Text>
                        <DatabaseIcon size={16} color={token.colorPrimary} />
                      </div>
                      <Title level={4} style={{ margin: 0 }}>{formatFileSize(stats.database.totalSize)}</Title>
                      <Text type="secondary" style={{ fontSize: 11 }}>{stats.database.totalFiles} files • {stats.database.totalFolders} folders</Text>
                    </Space>
                  </Card>
                </Col>
                
                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10 }} styles={{ body: { padding: 16 } }}>
                    <Space orientation="vertical" style={{ width: '100%' }} size={4}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13 }}>MinIO Storage Used</Text>
                        <HardDriveIcon size={16} color={token.colorSuccess} />
                      </div>
                      <Title level={4} style={{ margin: 0 }}>{formatFileSize(stats.server.total)}</Title>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {Object.entries(stats.server.perBucket || {})
                          .map(([name, info]: any) => `${name}: ${formatFileSize(info?.size || 0)}`)
                          .join(' • ') || 'No buckets scanned'}
                      </Text>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10 }} styles={{ body: { padding: 16 } }}>
                    <Space orientation="vertical" style={{ width: '100%' }} size={4}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13 }}>MinIO Objects</Text>
                        <CloudDownloadIcon size={16} color="#8b5cf6" />
                      </div>
                      <Title level={4} style={{ margin: 0 }}>
                        {(stats.server.objectCount ?? 0).toLocaleString()}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {Object.entries(stats.server.perBucket || {})
                          .map(([name, info]: any) => `${name}: ${(info?.count || 0).toLocaleString()}`)
                          .join(' • ') || 'Live objects in configured buckets'}
                      </Text>
                    </Space>
                  </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                  <Card style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10 }} styles={{ body: { padding: 16 } }}>
                    <Space orientation="vertical" style={{ width: '100%' }} size={4}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13 }}>Sync Status</Text>
                        <SyncOutlined style={{ fontSize: 16, color: token.colorWarning }} spin={loadingSyncAll} />
                      </div>
                      <Title level={4} style={{ margin: 0 }}>Ready</Title>
                      <Button 
                        type="link" 
                        size="small" 
                        onClick={handleSyncAll} 
                        disabled={loadingSyncAll}
                        style={{ padding: 0, color: token.colorWarning, fontSize: 12 }}
                      >
                        {loadingSyncAll ? 'Syncing...' : 'Global Force Sync'}
                      </Button>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </div>
          }

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={mode === 'picker' ? 5 : 4} style={{ margin: 0, fontWeight: 500 }}>STORAGE BUCKETS</Title>
            {mode === 'page' && (
              <Button 
                type="text"
                icon={<SyncOutlined spin={loadingSyncAll} />}
                onClick={handleSyncAll}
                loading={loadingSyncAll}
                size="small"
              >
                Sync All
              </Button>
            )}
          </div>

          <div style={{ maxHeight: mode === 'picker' ? '50vh' : 'calc(100vh - 450px)', overflowY: 'auto', paddingRight: 4 }}>
            {fileCategoryAndTypesResponse?.data?.buckets && fileCategoryAndTypesResponse.data.buckets.length > 0 ? (
              fileCategoryAndTypesResponse.data.buckets.map((b: any) => (
                <div key={b.name} style={{ marginBottom: 24 }}>
                  <Title level={5} style={{ marginBottom: 12, fontSize: 12, letterSpacing: '0.05em', fontWeight: 600 }}>{b.name.toUpperCase()}</Title>
                  <Row gutter={mode === 'picker' ? [12, 12] : [16, 16]}>
                    {b.categories.map((cat: string) => (
                      <Col key={cat} xs={12} sm={8} md={6} lg={4} xl={3}>
                        <Card
                          hoverable
                          onClick={() => handleBucketClick(cat)}
                          style={{
                            borderRadius: 10,
                            textAlign: 'center'
                          }}
                          styles={{ body: { padding: mode === 'picker' ? '12px' : '16px' } }}
                        >
                          <FolderOutlined style={{ fontSize: mode === 'picker' ? 24 : 32, color: '#faad14', marginBottom: 8 }} />
                          <div><Text strong style={{ fontSize: mode === 'picker' ? 13 : 14 }}>{cat}</Text></div>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </div>
              ))
            ) : (
              <Row gutter={mode === 'picker' ? [12, 12] : [16, 16]}>
                {categories.map((bucket) => (
                  <Col key={bucket} xs={12} sm={8} md={6} lg={4} xl={3}>
                    <Card
                      hoverable
                      onClick={() => handleBucketClick(bucket)}
                      style={{
                        borderRadius: 10,
                        textAlign: 'center'
                      }}
                      styles={{ body: { padding: mode === 'picker' ? '12px' : '16px' } }}
                    >
                      <FolderOutlined style={{ fontSize: mode === 'picker' ? 24 : 32, color: '#faad14', marginBottom: 8 }} />
                      <div><Text strong style={{ fontSize: mode === 'picker' ? 13 : 14 }}>{bucket}</Text></div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </div>
        </div>
      );
    }

    if (loadingFileLogs && files.length === 0) {
      return <div style={{ padding: 24 }}><ListShimmer /></div>;
    }

    return (
      <div 
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100%' }}
        onContextMenu={handleGlobalContextMenu}
        onClick={() => setContextMenuVisible(false)}
      >
        {/* Bucket Header Information */}
        <div style={{ padding: mode === 'picker' ? '12px 16px' : '24px 24px 16px', backgroundColor: 'transparent' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={mode === 'picker' ? 5 : 3} style={{ margin: 0 }}>
                {currentBucket}
              </Title>
              <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                {(() => {
                  const isBucketPublic = files.length > 0 ? files[0].isPublic : (currentBucket === 'public');
                  return (
                    <Text style={{ fontSize: 11 }}>
                      Status: <Tag color={isBucketPublic ? 'green' : 'blue'} style={{ fontSize: 9, height: 16, lineHeight: '14px' }}>
                        {isBucketPublic ? 'PUBLIC' : 'PRIVATE'}
                      </Tag>
                    </Text>
                  )
                })()}
                <Text style={{ fontSize: 11 }}>Items: {pagination.total}</Text>
              </div>
            </div>
            <Space>
              <Button 
                icon={<SyncOutlined spin={loadingFileLogs} />} 
                onClick={handleSyncBucket}
                loading={loadingFileLogs}
                size={mode === 'picker' ? "small" : "middle"}
                className={mode === 'page' ? "dark-btn" : ""}
                style={{ backgroundColor: 'transparent', borderRadius: 6 }}
              >
                Refresh
              </Button>
              <Button 
                type="primary" 
                size={mode === 'picker' ? "small" : "middle"}
                icon={<CloudUploadOutlined />} 
                onClick={() => fileInputRef.current?.click()}
                style={{ borderRadius: 6 }}
              >
                Upload
              </Button>
            </Space>
          </div>
        </div>

        {/* Sub-header inside category */}
        <div style={{ 
          padding: '12px 24px', 
          borderBottom: `1px solid ${token.colorBorderSecondary}`, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center'}}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
            <Button 
              icon={<ChevronLeft size={18} />} 
              type="text" 
              onClick={handleGoBack}
            />
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              borderRadius: 4, 
              padding: '4px 12px',
              border: `1px solid ${token.colorBorderSecondary}`,
              flex: 1,
              maxWidth: 800
            }}>
              <Breadcrumb 
                separator={<ChevronRight size={14} style={{ color: token.colorTextQuaternary }} />}
                items={[
                  { title: <a onClick={() => handleBreadcrumbClick({id: null, name: ""}, -1)}>{currentMinioBucket || "Storage"}</a> },
                  ...pathHistory.map((item, idx) => ({
                    title: <a onClick={() => handleBreadcrumbClick(item, idx)}>{item.name}</a>
                  }))
                ]}
              />
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                 {currentFolderPath && (
                   <Button 
                    type="link" 
                    size="small" 
                    icon={<SyncOutlined spin={loadingSync} />} 
                    onClick={() => handleForceSync(currentBucket || undefined)}
                    style={{ fontSize: 11, height: 24, padding: '0 8px', display: 'flex', alignItems: 'center' }}
                   >
                     Reload folder
                   </Button>
                 )}
                 <Tooltip title="Copy path">
                   <Button 
                    type="text" 
                    size="small" 
                    icon={<Copy size={14} />} 
                    onClick={() => {
                      const fullPath = [currentBucket, currentFolderPath].filter(Boolean).join("/");
                      navigator.clipboard.writeText(fullPath);
                      antMessage.success("Path copied");
                    }}
                   />
                 </Tooltip>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Input
              placeholder="Search in this folder..."
              prefix={<SearchIcon size={16} />}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onPressEnter={() => {
                setSearchTerm(searchInput);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              allowClear
              onClear={() => {
                setSearchInput("");
                setSearchTerm("");
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              style={{ 
                borderRadius: 6,
                width: 250,
                backgroundColor: 'transparent',
                borderColor: '#4b5563'
              }}
            />
            <Radio.Group 
              value={viewMode} 
              onChange={(e) => setViewMode(e.target.value)} 
              size="small"
              className="dark-radio-group"
              style={{ marginRight: 8 }}
            >
              <Radio.Button value="list"><BarsOutlined /></Radio.Button>
              <Radio.Button value="grid"><AppstoreOutlined /></Radio.Button>
            </Radio.Group>
            <Button 
              type="text" 
              style={{ fontWeight: 500 }}
              icon={<PlusIcon size={16} />}
              onClick={() => {
                setIsNewFolderModalOpen(true);
                setIsNewFolderPublic(currentBucket === 'public');
              }}
            >
              Create new folder
            </Button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: viewMode === 'grid' ? '16px 24px' : 0 }}>
          {viewMode === 'list' ? (
            <Table
              columns={columns as any}
              dataSource={files}
              rowKey="id"
              pagination={false}
              loading={loadingFileLogs}
              onChange={handleTableChange}
              scroll={{ y: 'calc(100vh - 350px)' }}
              style={{ backgroundColor: 'transparent' }}
              className="dark-table"
              rowClassName="file-row"
              onRow={(record: any) => ({
                onClick: () => {
                  if (record.isFolder) {
                    handleFolderClick(record);
                  } else {
                    setSelectedFileForDetails(record);
                    setShowDetails(true);
                  }
                },
                onContextMenu: (e) => e.stopPropagation(), 
              })}
              locale={{
                emptyText: (
                  <Empty 
                    image={Empty.PRESENTED_IMAGE_SIMPLE} 
                    description={<span>No items found</span>} 
                  />
                )
              }}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {files.length === 0 && !loadingFileLogs && (
                <Col span={24}>
                  <div style={{ padding: '64px 0', textAlign: 'center' }}>
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={<span>No items found</span>} />
                  </div>
                </Col>
              )}
              {files.map((file: any) => {
                const FileIcon = file.isFolder ? FolderIcon : getFileIcon(file.type, file.mimeType);
                const isImg = file.mimeType?.startsWith("image/");
                
                return (
                  <Col key={file.id} xs={12} sm={8} md={6} lg={4} xl={3}>
                    <Card
                      hoverable
                      className="file-card-grid"
                      style={{ 
                        borderRadius: 8,
                        overflow: 'hidden'
                      }}
                      styles={{ body: { padding: mode === 'picker' ? '4px 8px' : '8px 12px' } }}
                      cover={
                        <div 
                          onClick={() => file.isFolder ? handleFolderClick(file) : (setSelectedFileForDetails(file), setShowDetails(true))}
                          style={{ 
                            height: mode === 'picker' ? 80 : 120, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                        >
                          {isImg ? (
                            <img 
                              src={getFullUrl(file.url, file.bucket)} 
                              alt={file.fileName}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "";
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <FileIcon size={mode === 'picker' ? 24 : 40} color={file.isFolder ? "#faad14" : "#4b5563"} />
                          )}
                          <div style={{ position: 'absolute', top: 4, right: 4 }}>
                            <Dropdown 
                              menu={{
                                items: [
                                  { key: 'preview', label: 'Preview', icon: <EyeOutlined />, onClick: (e) => { e.domEvent.stopPropagation(); handlePreview(file); }, disabled: file.isFolder && file.type !== 'audio' && file.type !== 'video' },
                                  { key: 'download', label: 'Download', icon: <DownloadOutlined />, onClick: (e) => { e.domEvent.stopPropagation(); window.open(file.url, '_blank'); }, disabled: file.isFolder },
                                  mode === 'picker' ? { key: 'select', label: 'Select', icon: <CheckIcon size={14} />, onClick: (e) => { e.domEvent.stopPropagation(); onSelect && onSelect([file]); } } : { key: 'rename', label: 'Rename', icon: <EditOutlined />, onClick: (e) => { e.domEvent.stopPropagation(); setRenamingFile(file); setNewName(file.fileName); } },
                                  { key: 'resync', label: 'Resync Source', icon: <SyncOutlined />, onClick: (e) => { e.domEvent.stopPropagation(); handleForceSync(file.category); } },
                                  { type: 'divider' },
                                  { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: (e) => { e.domEvent.stopPropagation(); handleDelete(file.id); } },
                                ]
                              }}
                              trigger={['click']}
                            >
                              <Button 
                                type="text" 
                                size="small" 
                                onClick={(e) => e.stopPropagation()}
                                icon={<MoreVertical size={12} />} 
                                style={{ padding: 0, width: 20, height: 20 }} 
                              />
                            </Dropdown>
                          </div>
                        </div>
                      }
                    >
                      <Tooltip title={file.fileName}>
                        <Text 
                          ellipsis 
                          style={{ display: 'block',fontSize: mode === 'picker' ? 11 : 13, textAlign: 'center' }}
                        >
                          {file.fileName}
                        </Text>
                      </Tooltip>
                      {processingFiles && processingFiles[file.id] && (
                        <div style={{ marginTop: 8, padding: '0 4px' }}>
                          <Progress 
                            percent={processingFiles[file.id].progress} 
                            size="small" 
                            status={processingFiles[file.id].status === 'error' ? 'exception' : 'active'}
                            strokeColor={processingFiles[file.id].status === 'error' ? '#ef4444' : '#10b981'}
                            format={(p) => <span style={{ fontSize: 9, color: '#9ca3af' }}>{p}%</span>}
                          />
                          <Text style={{ fontSize: 8, color: '#9ca3af', textAlign: 'center', display: 'block' }} ellipsis>
                            {processingFiles[file.id].message}
                          </Text>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4, gap: 4 }}>
                        <Tag color={file.isPublic ? "green" : "blue"} style={{ fontSize: 8, height: 14, lineHeight: '12px', margin: 0, padding: '0 2px' }}>
                          {file.isPublic ? "PUB" : "PRIV"}
                        </Tag>
                        {mode === 'picker' && (!file.isFolder || file.type === 'audio' || file.type === 'video') && (
                          <Button 
                            type="primary" 
                            size="small" 
                            style={{ fontSize: 9, height: 16, padding: '0 4px', borderRadius: 4 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelect && onSelect([file]);
                            }}
                          >
                            SELECT
                          </Button>
                        )}
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          )}
        </div>

        <div style={{ 
          padding: '16px 24px', 
          borderTop: `1px solid ${token.colorBorderSecondary}`, 
          display: 'flex', 
          justifyContent: 'flex-end'
        }}>
          <Pagination
            current={pagination.page}
            pageSize={pagination.limit}
            total={pagination.total}
            onChange={(page, pageSize) => setPagination(prev => ({ ...prev, page, limit: pageSize }))}
            size="small"
            showSizeChanger
            showTotal={(total) => <span>Total {total} items</span>}
          />
        </div>

        {/* Global Context Menu */}
        {contextMenuVisible && (
          <div 
            style={{ 
              position: 'fixed', 
              top: contextMenuPos.y, 
              left: contextMenuPos.x, 
              zIndex: 1000,
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              padding: '4px 0',
              minWidth: 180
            }}
          >
            <Menu
              style={{ background: 'transparent', border: 'none' }}
              theme="dark"
              onClick={({ key }) => {
                setContextMenuVisible(false);
                if (key === 'new-folder') setIsNewFolderModalOpen(true);
                else if (key === 'sync') handleSyncBucket();
                else if (key === 'upload') setIsUploadModalOpen(true);
              }}
              items={[
                { key: 'new-folder', icon: <PlusIcon size={14} />, label: 'New Folder' },
                { key: 'upload', icon: <UploadIcon size={14} />, label: 'Upload File' },
                { type: 'divider' },
                { key: 'sync', icon: <SyncOutlined spin={loadingSync} />, label: 'Sync Category' },
              ]}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout style={{ height: '100%', overflow: 'hidden' }}>
      <Content style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {renderContent()}
      </Content>


      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        multiple={multiple} 
        accept="image/*,video/*,audio/*"
        onChange={(e) => handleFileSelect(e.target.files)} 
      />

      <AntModal
        title="Create New Folder"
        open={isNewFolderModalOpen}
        onOk={handleCreateFolder}
        onCancel={() => setIsNewFolderModalOpen(false)}
        okText="Create"
        className="dark-modal"
      >
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <Input 
            placeholder="Folder name" 
            value={newFolderName} 
            onChange={e => setNewFolderName(e.target.value)}
            autoFocus
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Text>Public Access</Text>
            <Switch 
              checked={isNewFolderPublic} 
              onChange={setIsNewFolderPublic}
              size="small"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {isNewFolderPublic ? '(Visible to everyone)' : '(Restricted access)'}
            </Text>
          </div>
        </Space>
      </AntModal>

      <AntModal
        title="Rename Item"
        open={!!renamingFile}
        onOk={saveRename}
        onCancel={() => setRenamingFile(null)}
        className="dark-modal"
      >
        <Input 
          value={newName} 
          onChange={e => setNewName(e.target.value)}
          autoFocus
        />
      </AntModal>

      <AntModal
        title={`Preview: ${previewFile?.fileName}`}
        open={showPreview}
        onCancel={() => setShowPreview(false)}
        footer={null}
        width={900}
        centered
        destroyOnHidden
      >
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          {renderPreviewContent()}
        </div>
      </AntModal>

      <Drawer
        title={
          selectedFileForDetails && (
            <Space>
              {(() => {
                const Icon = selectedFileForDetails.isFolder ? FolderOutlined : getFileIcon(selectedFileForDetails.type, selectedFileForDetails.mimeType);
                return <Icon size={20} style={{ color: selectedFileForDetails.isFolder ? "#faad14" : undefined }} />;
              })()}
              <Text strong>{selectedFileForDetails.fileName}</Text>
            </Space>
          )
        }
        placement="right"
        onClose={() => setShowDetails(false)}
        open={showDetails}
        styles={{ body: { padding: '24px' } }}
        style={{ width: 400 }}
      >
        {selectedFileForDetails && (
          <Space orientation="vertical" style={{ width: '100%' }} size="large">
            <div>
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Actions:</Text>
              <Menu
                mode="vertical"
                selectable={false}
                items={[
                  { 
                    key: 'download', 
                    icon: <DownloadOutlined />, 
                    label: 'Download', 
                    onClick: () => window.open(getFullUrl(selectedFileForDetails.url, selectedFileForDetails.bucket), '_blank') 
                  },
                  { 
                    key: 'share', 
                    icon: <ShareIcon />, 
                    label: 'Share', 
                    onClick: () => {
                      if (selectedFileForDetails.url) {
                        navigator.clipboard.writeText(getFullUrl(selectedFileForDetails.url, selectedFileForDetails.bucket));
                        antMessage.success("Link copied to clipboard");
                      }
                    } 
                  },
                  { 
                    key: 'preview', 
                    icon: <EyeOutlined />, 
                    label: 'Preview', 
                    disabled: !isPreviewable(selectedFileForDetails),
                    onClick: () => handlePreview(selectedFileForDetails) 
                  },
                  { type: 'divider' },
                  mode === 'picker' ? {
                    key: 'select',
                    icon: <CheckIcon size={16} />,
                    label: 'Select File',
                    onClick: () => onSelect && onSelect([selectedFileForDetails])
                  } : { 
                    key: 'delete', 
                    icon: <DeleteOutlined />, 
                    label: 'Delete', 
                    danger: true, 
                    onClick: () => handleDelete(selectedFileForDetails.id) 
                  },
                  { 
                    key: 'resync', 
                    icon: <SyncOutlined />, 
                    label: 'Resync Source', 
                    onClick: () => handleForceSync(selectedFileForDetails.category) 
                  },
                ]}
              />
            </div>

            <Divider style={{ margin: '12px 0' }} />

            <div>
              <Title level={5} style={{ marginBottom: 16 }}>Object Info</Title>
              <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ display: 'block' }}>Name:</Text>
                  <Text strong>{selectedFileForDetails.fileName}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block' }}>Size:</Text>
                  <Text>{formatFileSize(selectedFileForDetails.size)}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block' }}>Last Modified:</Text>
                  <Text>{dayjs(selectedFileForDetails.lastModified).format('MMM D, YYYY HH:mm')}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block' }}>Category:</Text>
                  <Text>{selectedFileForDetails.category}</Text>
                </div>
                <div>
                  <Text type="secondary" style={{ display: 'block' }}>Status:</Text>
                  <Tag color={selectedFileForDetails.isPublic ? "green" : "blue"}>
                    {selectedFileForDetails.isPublic ? "Public" : "Private"}
                  </Tag>
                </div>
              </Space>
            </div>
          </Space>
        )}
      </Drawer>

      <AntModal 
        title="Upload Files" 
        open={isUploadModalOpen} 
        onCancel={() => setIsUploadModalOpen(false)}
        footer={null}
        width={600}
        className="dark-modal"
      >
        <div style={{ textAlign: 'right', marginBottom: 16 }}>
          <Space>
            <Button onClick={() => setUploadFiles([])}>Clear All</Button>
            <Button type="primary" onClick={() => uploadFiles.forEach(uf => !uf.uploading && handleUploadFile(uf))}>Upload All</Button>
          </Space>
        </div>
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {uploadFiles.map(uf => {
            const trackingId = (uf as any).trackingId;
            const isProcessing = trackingId && processingFiles && processingFiles[trackingId];
            const pData = isProcessing ? processingFiles![trackingId!] : null;

            return (
              <div key={uf.id} style={{ display: 'flex', flexDirection: 'column', marginBottom: 16, padding: 12, borderRadius: 8, backgroundColor: '#1f2937' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <Text ellipsis strong>{uf.file.name}</Text>
                    <div>
                      {uf.uploading && !isProcessing && (
                        <Space size={8}>
                          <Progress percent={uf.progress} size="small" strokeColor="#3b82f6" style={{ width: 200, margin: 0 }} />
                          <Text type="secondary" style={{ fontSize: 11 }}>Uploading...</Text>
                        </Space>
                      )}
                      {isProcessing && (
                        <Space size={8}>
                          <Progress percent={pData?.progress} size="small" strokeColor="#10b981" style={{ width: 200, margin: 0 }} />
                          <Text style={{ fontSize: 11, color: '#10b981' }}>Processing: {pData?.progress}%</Text>
                        </Space>
                      )}
                    </div>
                  </div>
                  {!isProcessing && (
                    <Checkbox 
                      checked={uf.isPublic} 
                      onChange={e => setUploadFiles(prev => prev.map(f => f.id === uf.id ? {...f, isPublic: e.target.checked} : f))}
                    >
                      Public
                    </Checkbox>
                  )}
                  {!uf.uploading && (
                    <Button type="text" icon={<XIcon size={14} />} onClick={() => setUploadFiles(prev => prev.filter(f => f.id !== uf.id))} style={{ color: '#ef4444' }} />
                  )}
                  {isProcessing && pData?.progress === 100 && (
                     <CheckIcon size={16} color="#10b981" />
                  )}
                </div>
                {pData?.message && (
                  <Text type="secondary" style={{ fontSize: 10, marginTop: 4 }}>{pData.message}</Text>
                )}
              </div>
            );
          })}
        </div>
      </AntModal>
    </Layout>
  );
};

export default FileBrowser;
