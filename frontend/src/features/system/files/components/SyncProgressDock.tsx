"use client";

import React from "react";
import { Progress, Space, Tooltip, Typography, theme } from "antd";
import { CloudDownloadOutlined, ReloadOutlined } from "@ant-design/icons";

const { Text } = Typography;

export interface SyncProgressDockProps {
  running: boolean;
  progress: number;
  message: string;
  /** When true, the dock animates in. Otherwise it stays mounted but hidden. */
}

/**
 * Floating bottom-right widget that surfaces background storage-sync progress
 * (MinIO ↔ DB reconciliation) without blocking the page.
 * Mirrors the look of the audit-log retention banner.
 */
const SyncProgressDock: React.FC<SyncProgressDockProps> = ({
  running,
  progress,
  message,
}) => {
  const { token } = theme.useToken();

  if (!running) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 340,
        padding: 18,
        borderRadius: token.borderRadiusLG,
        background: token.colorBgElevated,
        boxShadow: token.boxShadowSecondary,
        border: `1px solid ${token.colorBorderSecondary}`,
        zIndex: 1000,
      }}
    >
      <Space orientation="vertical" style={{ width: "100%" }} size="middle">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text strong>
            <CloudDownloadOutlined
              style={{ color: token.colorPrimary, marginRight: 8 }}
            />
            Syncing storage
            <Tooltip title="Reconciling MinIO objects with the file_log table">
              <ReloadOutlined
                spin
                style={{
                  color: token.colorTextTertiary,
                  marginLeft: 8,
                  fontSize: 12,
                }}
              />
            </Tooltip>
          </Text>
          <Text style={{ fontSize: 13 }}>{progress}%</Text>
        </div>
        <Progress
          percent={progress}
          size="small"
          showInfo={false}
          strokeColor={{
            "0%": token.colorPrimary,
            "100%": token.colorSuccess,
          }}
        />
        <Text
          type="secondary"
          style={{ fontSize: 12 }}
          ellipsis={{ tooltip: message }}
        >
          {message || "Working…"}
        </Text>
      </Space>
    </div>
  );
};

export default SyncProgressDock;
