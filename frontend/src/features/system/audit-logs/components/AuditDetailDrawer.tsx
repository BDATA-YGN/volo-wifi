"use client";

import React, { useMemo } from "react";
import {
  Descriptions,
  Drawer,
  Tag,
  Typography,
  theme,
} from "antd";
import dayjs from "dayjs";

import { SEVERITY_COLOR, TYPE_COLOR } from "../constant";
import type { AuditLogRecord } from "../interface";

interface AuditDetailDrawerProps {
  open: boolean;
  record: AuditLogRecord | null;
  onClose: () => void;
}

const formatDateTime = (iso?: string | null) =>
  iso ? dayjs(iso).format("DD MMM YYYY, HH:mm:ss") : "—";

const tryPrettyJson = (value: string | null | undefined) => {
  if (!value) return "";
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
};

const AuditDetailDrawer: React.FC<AuditDetailDrawerProps> = ({
  open,
  record,
  onClose,
}) => {
  const { token } = theme.useToken();

  const detailsPretty = useMemo(
    () => tryPrettyJson(record?.details),
    [record?.details],
  );

  return (
    <Drawer
      title="Audit log details"
      open={open}
      onClose={onClose}
      styles={{ wrapper: { width: 620, maxWidth: "100vw" } }}
      destroyOnHidden
    >
      {record ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Descriptions
            column={1}
            size="small"
            bordered
            styles={{ label: { width: 140, fontWeight: 600 } }}
          >
            <Descriptions.Item label="Timestamp">
              {formatDateTime(record.timestamp)}
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag color={TYPE_COLOR[record.type] ?? "default"}>{record.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Severity">
              <Tag color={SEVERITY_COLOR[record.severity as keyof typeof SEVERITY_COLOR] ?? "default"}>
                {record.severity}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="User">
              <Typography.Text strong>{record.userEmail || "—"}</Typography.Text>
              <br />
              <Typography.Text type="secondary" copyable={{ text: record.userId }}>
                {record.userId}
              </Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Action">
              <Typography.Text code>{record.action}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="Resource">
              <Typography.Text>{record.resource}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="IP address">
              <Typography.Text copyable>{record.ipAddress || "—"}</Typography.Text>
            </Descriptions.Item>
            <Descriptions.Item label="User agent">
              <Typography.Text style={{ wordBreak: "break-word" }}>
                {record.userAgent || "—"}
              </Typography.Text>
            </Descriptions.Item>
          </Descriptions>

          <div>
            <Typography.Title level={5} style={{ marginBottom: 8 }}>
              Details payload
            </Typography.Title>
            <pre
              style={{
                margin: 0,
                padding: 12,
                borderRadius: token.borderRadius,
                background: token.colorFillTertiary,
                color: token.colorText,
                fontSize: 12,
                lineHeight: 1.6,
                maxHeight: 320,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {detailsPretty || "—"}
            </pre>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
};

export default AuditDetailDrawer;
