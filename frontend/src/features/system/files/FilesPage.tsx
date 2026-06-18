"use client";

import React, { useState } from "react";
import { App, theme } from "antd";

import CommonHeader from "@/common/components/@bdata/CommonHeader";
import FileBrowser from "@/common/components/FileManager/FileBrowser";
import { useSocketEvent } from "@/lib/socket/SocketProvider";
import { useFileLogs } from "@/features/core/files/useFile";

import FilesInfoBanner from "./components/FilesInfoBanner";
import ProcessingLogsModal, {
  ProcessingFileState,
} from "./components/ProcessingLogsModal";
import SyncProgressDock from "./components/SyncProgressDock";

interface SyncState {
  running: boolean;
  progress: number;
  message: string;
}

const INITIAL_SYNC_STATE: SyncState = {
  running: false,
  progress: 0,
  message: "",
};

/**
 * `/system/files` — MinIO-backed file manager page.
 *
 * The actual browser experience (folders, upload modal, preview, grid/list
 * toggle, breadcrumbs) lives in the shared `<FileBrowser />`. This page only
 * owns the chrome around it: header, info banner, and the side-channel UI
 * for socket-driven background work (media processing logs + sync progress).
 */
const FilesPage: React.FC = () => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { cancelProcessing, retryProcessing } = useFileLogs();

  const [refreshKey, setRefreshKey] = useState(0);
  const [processingFiles, setProcessingFiles] = useState<
    Record<string, ProcessingFileState>
  >({});
  const [processingLogs, setProcessingLogs] = useState<Record<string, string[]>>(
    {},
  );
  const [activeLogFileId, setActiveLogFileId] = useState<string | null>(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [syncState, setSyncState] = useState<SyncState>(INITIAL_SYNC_STATE);

  useSocketEvent("media_processing_progress", (payload: any) => {
    if (!payload) return;
    const eventData = payload?.data || payload;
    const fileId = eventData?.fileId;
    if (!fileId) return;

    setProcessingFiles((prev) => ({
      ...prev,
      [fileId]: {
        progress: eventData?.progress ?? 0,
        message: eventData?.message || "Processing…",
        status: payload?.status || eventData?.status || "info",
      },
    }));

    if (eventData.progress === 100) {
      setTimeout(() => {
        setProcessingFiles((prev) => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
        setRefreshKey((prev) => prev + 1);
      }, 5000);
    }
  });

  useSocketEvent("media_processing_log", (payload: any) => {
    if (!payload) return;
    const eventData = payload?.data || payload;
    const fileId = eventData?.fileId;
    if (!fileId || !eventData?.log) return;
    setProcessingLogs((prev) => ({
      ...prev,
      [fileId]: [...(prev[fileId] || []).slice(-100), eventData.log],
    }));
  });

  useSocketEvent("SYNC_PROGRESS", (payload: any) => {
    const data = payload?.data || payload;
    if (!data || typeof data !== "object") return;

    const progress = data.progress ?? 0;
    setSyncState({
      running: progress < 100,
      progress,
      message: data.message || "",
    });

    if (progress === 100) {
      setRefreshKey((prev) => prev + 1);
      if (data.status === "success") message.success(data.message);
      else if (data.status === "error") message.error(data.message);
    }
  });

  const showLogs = (fileId: string) => {
    setActiveLogFileId(fileId);
    setIsLogModalOpen(true);
  };

  const handleCancelProcessing = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    try {
      await cancelProcessing(fileId);
      message.success("Processing cancellation requested");
    } catch {
      message.error("Failed to cancel processing");
    }
  };

  const handleRetryProcessing = async (e: React.MouseEvent, fileId: string) => {
    e.stopPropagation();
    try {
      await retryProcessing(fileId);
      message.success("Processing retry requested");
    } catch {
      message.error("Failed to retry processing");
    }
  };

  return (
    <div className="p-0">
      <CommonHeader />
      <div
        style={{
          height: "var(--content-body-height)",
          overflow: "hidden",
          background: token.colorBgLayout,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "16px 20px 0 20px" }}>
          <FilesInfoBanner />
        </div>

        <div style={{ flex: 1, minHeight: 0, padding: "12px 20px 20px 20px" }}>
          <div
            style={{
              height: "100%",
              borderRadius: token.borderRadiusLG,
              background: token.colorBgContainer,
              border: `1px solid ${token.colorBorderSecondary}`,
              overflow: "hidden",
            }}
          >
            <FileBrowser
              mode="page"
              refreshKey={refreshKey}
              processingFiles={processingFiles}
              onShowLogs={showLogs}
            />
          </div>
        </div>
      </div>

      <ProcessingLogsModal
        open={isLogModalOpen}
        activeFileId={activeLogFileId}
        logs={activeLogFileId ? processingLogs[activeLogFileId] || [] : []}
        fileState={activeLogFileId ? processingFiles[activeLogFileId] : undefined}
        onClose={() => setIsLogModalOpen(false)}
        onCancel={handleCancelProcessing}
        onRetry={handleRetryProcessing}
      />

      <SyncProgressDock
        running={syncState.running}
        progress={syncState.progress}
        message={syncState.message}
      />
    </div>
  );
};

export default FilesPage;
