"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { LiveOpsRecentSessionRow } from "../types";
import { SESSION_STATUS_COLOR } from "../constant";
import { formatBytes, formatDuration, formatSessionStatus } from "../utils";

const { Text } = Typography;

type Props = {
  rows: LiveOpsRecentSessionRow[];
  loading?: boolean;
};

const LiveOpsRecentSessionsTable: React.FC<Props> = ({ rows, loading }) => {
  const columns: ColumnsType<LiveOpsRecentSessionRow> = [
    {
      title: "User",
      dataIndex: "userName",
      key: "userName",
      ellipsis: true,
      render: (name: string | null) => name ?? "—",
    },
    {
      title: "Site",
      key: "site",
      width: 100,
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {row.stationCode ?? "—"}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string, row) => (
        <Tag color={row.isStalled ? "warning" : SESSION_STATUS_COLOR[status] ?? "default"}>
          {row.isStalled ? "Stalled" : formatSessionStatus(status)}
        </Tag>
      ),
    },
    {
      title: "Started",
      dataIndex: "startedAt",
      key: "startedAt",
      width: 130,
      render: (startedAt: string) => dayjs(startedAt).format("HH:mm:ss"),
    },
    {
      title: "Duration",
      key: "sessionTimeSec",
      width: 80,
      align: "right",
      render: (_, row) => formatDuration(row.sessionTimeSec),
    },
    {
      title: "Traffic",
      key: "totalBytes",
      width: 90,
      align: "right",
      render: (_, row) => formatBytes(row.totalBytes),
    },
  ];

  return (
    <Card size="small" title="Recent sessions" styles={{ body: { padding: 0 } }}>
      <Table<LiveOpsRecentSessionRow>
        size="small"
        rowKey="sessionId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        locale={{ emptyText: "No sessions in this window" }}
      />
    </Card>
  );
};

export default LiveOpsRecentSessionsTable;
