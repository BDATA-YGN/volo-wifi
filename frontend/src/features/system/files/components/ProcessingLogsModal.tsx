"use client";

import React, { useMemo } from "react";
import { Button, Modal, Space, Typography, theme } from "antd";
import {
  CloseCircleOutlined,
  RotateLeftOutlined,
  TrademarkCircleFilled,
} from "@ant-design/icons";

const { Text } = Typography;

export interface ProcessingFileState {
  progress: number;
  message: string;
  status: string;
}

export interface ProcessingLogsModalProps {
  open: boolean;
  activeFileId: string | null;
  logs: string[];
  fileState?: ProcessingFileState;
  onClose: () => void;
  onCancel: (e: React.MouseEvent, fileId: string) => void;
  onRetry: (e: React.MouseEvent, fileId: string) => void;
}

/**
 * Streamed processing logs for a single file (HLS transcode, image resize, etc.).
 * Rendered as a dark "console" panel for readability and lined up with the
 * design language we use across `/system/*` pages.
 */
const ProcessingLogsModal: React.FC<ProcessingLogsModalProps> = ({
  open,
  activeFileId,
  logs,
  fileState,
  onClose,
  onCancel,
  onRetry,
}) => {
  const { token } = theme.useToken();

  const reversedLogs = useMemo(() => [...logs].reverse(), [logs]);
  const isError = fileState?.status === "error";
  const isActive = !!fileState && !isError;

  return (
    <Modal
      title={
        <Space>
          <TrademarkCircleFilled style={{ color: token.colorPrimary }} />
          <span>Processing logs</span>
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={900}
      centered
      destroyOnHidden
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        isError && activeFileId ? (
          <Button
            key="retry"
            type="primary"
            icon={<RotateLeftOutlined />}
            onClick={(e) => onRetry(e, activeFileId)}
          >
            Retry
          </Button>
        ) : null,
        isActive && activeFileId ? (
          <Button
            key="cancel"
            danger
            icon={<CloseCircleOutlined />}
            onClick={(e) => onCancel(e, activeFileId)}
          >
            Cancel processing
          </Button>
        ) : null,
      ]}
    >
      <div
        style={{
          padding: 16,
          borderRadius: token.borderRadiusLG,
          background: "#0b1020",
          color: "#e2e8f0",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 12,
          lineHeight: 1.6,
          minHeight: 320,
          maxHeight: 520,
          overflowY: "auto",
        }}
      >
        {reversedLogs.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
            No logs available for this file yet.
          </div>
        ) : (
          reversedLogs.map((log, i) => (
            <div key={`${log}-${i}`} style={{ display: "flex", gap: 8 }}>
              <span style={{ color: "#7dd3fc", whiteSpace: "nowrap" }}>
                [{new Date().toLocaleTimeString()}]
              </span>
              <Text style={{ color: "#e2e8f0" }}>{log}</Text>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
};

export default ProcessingLogsModal;
