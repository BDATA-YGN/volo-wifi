"use client";

import React, { useEffect, useState } from "react";
import { Alert, Descriptions, Drawer, Spin, Tag, Typography } from "antd";
import dayjs from "dayjs";
import type { ActivityLogRecord } from "../types";
import { ACTION_COLOR, DEFAULT_ACTION_COLOR } from "../constant";
import { formatActionLabel, formatEntityLabel } from "../utils";

const { Text, Title } = Typography;

type Props = {
  open: boolean;
  entryId: string | null;
  fallback?: ActivityLogRecord | null;
  onClose: () => void;
  loadEntry: (id: string) => Promise<ActivityLogRecord>;
};

const ActivityLogDetailDrawer: React.FC<Props> = ({
  open,
  entryId,
  fallback,
  onClose,
  loadEntry,
}) => {
  const [entry, setEntry] = useState<ActivityLogRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !entryId) {
      setEntry(null);
      return;
    }

    if (fallback?.id === entryId) {
      setEntry(fallback);
    }

    setLoading(true);
    void loadEntry(entryId)
      .then(setEntry)
      .catch(() => {
        if (fallback?.id === entryId) setEntry(fallback);
      })
      .finally(() => setLoading(false));
  }, [open, entryId, fallback, loadEntry]);

  const row = entry;
  const metaJson =
    row?.meta && Object.keys(row.meta).length > 0
      ? JSON.stringify(row.meta, null, 2)
      : null;

  return (
    <Drawer title="Activity details" size={520} open={open} onClose={onClose} destroyOnClose>
      <Spin spinning={loading}>
        {row ? (
          <>
            <div className="mb-4">
              <Title level={5} style={{ margin: 0 }}>
                {formatActionLabel(row.action)}
              </Title>
              <Tag color={ACTION_COLOR[row.action] ?? DEFAULT_ACTION_COLOR} className="mt-2">
                {row.action}
              </Tag>
            </div>

            <Alert
              type="info"
              showIcon
              className="mb-4"
              title="Read-only audit record"
              description="Entries are written automatically when privileged actions occur in the console. They cannot be edited or deleted."
            />

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Entry ID">
                <Text code copyable>
                  {row.id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Timestamp">
                {dayjs(row.createdAt).format("YYYY-MM-DD HH:mm:ss")}
              </Descriptions.Item>
              <Descriptions.Item label="Actor">
                {row.admin ? (
                  <>
                    {row.admin.fullName}{" "}
                    <Text type="secondary">(@{row.admin.username})</Text>
                  </>
                ) : (
                  <Text type="secondary">System / unknown</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Entity">
                {row.entity ? formatEntityLabel(row.entity) : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Entity ID">
                {row.entityId ? (
                  <Text code copyable>
                    {row.entityId}
                  </Text>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="IP address">{row.ip ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="User agent">
                {row.userAgent ? (
                  <Text style={{ fontSize: 12, wordBreak: "break-all" }}>{row.userAgent}</Text>
                ) : (
                  "—"
                )}
              </Descriptions.Item>
            </Descriptions>

            {metaJson ? (
              <div className="mt-4">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Metadata
                </Text>
                <pre
                  style={{
                    marginTop: 8,
                    padding: 12,
                    borderRadius: 8,
                    background: "var(--ant-color-fill-quaternary, #f5f5f5)",
                    fontSize: 12,
                    overflow: "auto",
                    maxHeight: 280,
                  }}
                >
                  {metaJson}
                </pre>
              </div>
            ) : null}
          </>
        ) : (
          !loading && <Text type="secondary">Entry not found.</Text>
        )}
      </Spin>
    </Drawer>
  );
};

export default ActivityLogDetailDrawer;
