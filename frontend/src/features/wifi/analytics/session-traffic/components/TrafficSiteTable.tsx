"use client";

import React from "react";
import Link from "next/link";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SessionTrafficSiteRow } from "../types";
import { STATION_STATUS_COLOR, formatBytes, formatDuration } from "../utils";

const { Text } = Typography;

type Props = {
  rows: SessionTrafficSiteRow[];
  loading?: boolean;
  selectedStationId?: string;
  onSelectStation?: (stationId: string) => void;
};

const TrafficSiteTable: React.FC<Props> = ({
  rows,
  loading,
  selectedStationId,
  onSelectStation,
}) => {
  const columns: ColumnsType<SessionTrafficSiteRow> = [
    {
      title: "Site",
      key: "site",
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-2">
            <Text strong style={{ fontSize: 13 }}>
              {row.name}
            </Text>
            <Tag color={STATION_STATUS_COLOR[row.status] ?? "default"} style={{ fontSize: 11 }}>
              {row.status}
            </Tag>
          </div>
          <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
            {row.code}
          </Text>
        </div>
      ),
    },
    {
      title: "Sessions",
      dataIndex: "sessionsCount",
      key: "sessionsCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.sessionsCount - b.sessionsCount,
      defaultSortOrder: "descend",
    },
    {
      title: "Users",
      dataIndex: "uniqueCredentials",
      key: "uniqueCredentials",
      width: 80,
      align: "right",
      sorter: (a, b) => a.uniqueCredentials - b.uniqueCredentials,
    },
    {
      title: "Data",
      key: "totalBytes",
      width: 100,
      align: "right",
      render: (_, row) => formatBytes(row.totalBytes),
      sorter: (a, b) => a.totalBytes - b.totalBytes,
    },
    {
      title: "Avg time",
      key: "avgTime",
      width: 90,
      align: "right",
      render: (_, row) =>
        formatDuration(
          row.sessionsCount > 0
            ? Math.round(row.totalSessionTimeSec / row.sessionsCount)
            : 0
        ),
    },
  ];

  return (
    <Card
      size="small"
      title="By site"
      extra={
        <Link href="/wifi/network/radius/live-sessions">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Live sessions →
          </Text>
        </Link>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<SessionTrafficSiteRow>
        size="small"
        rowKey="stationId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 8, hideOnSinglePage: true, size: "small" }}
        rowClassName={(row) =>
          row.stationId === selectedStationId ? "ant-table-row-selected" : ""
        }
        onRow={(row) => ({
          onClick: () => onSelectStation?.(row.stationId),
          style: { cursor: onSelectStation ? "pointer" : undefined },
        })}
        scroll={{ x: 480 }}
      />
    </Card>
  );
};

export default TrafficSiteTable;
