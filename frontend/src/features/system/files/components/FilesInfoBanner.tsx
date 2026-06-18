"use client";

import React, { useEffect, useState } from "react";
import { Alert, Space, Tag, Typography, theme } from "antd";
import { CloudServerOutlined } from "@ant-design/icons";
import { CHUNK_SIZE } from "@/features/core/files/constant";
import { storageKey } from "@/lib/cacheKeys";

const STORAGE_KEY = storageKey("system.files.info-banner.dismissed.v1");

const formatMB = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

/**
 * Lightweight, dismissable info strip. Mirrors the visual weight of
 * `RetentionBanner` in `/system/audit-logs` so the two pages feel related.
 */
const FilesInfoBanner: React.FC = () => {
  const { token } = theme.useToken();
  const [dismissed, setDismissed] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const handleClose = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* no-op: best-effort persistence */
    }
  };

  if (dismissed) return null;

  return (
    <Alert
      type="info"
      showIcon
      closable
      onClose={handleClose}
      icon={<CloudServerOutlined />}
      title={
        <Space size={8} wrap>
          <Typography.Text strong>Object storage powered by MinIO</Typography.Text>
          <Tag color="blue">S3-compatible</Tag>
          <Tag>Chunk upload above {formatMB(CHUNK_SIZE)}</Tag>
          <Tag color="green">HLS streaming for video / audio</Tag>
        </Space>
      }
      description={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Drag files anywhere on the canvas to upload. Large files are split
          into {formatMB(CHUNK_SIZE)} chunks and resumed on failure. Use the
          sync button to reconcile the database with MinIO if files were added
          outside the console.
        </Typography.Text>
      }
      style={{ borderRadius: token.borderRadiusLG }}
    />
  );
};

export default FilesInfoBanner;
