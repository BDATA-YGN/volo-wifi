"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { LiveOpsSiteRow } from "../types";
import { formatBytes, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: LiveOpsSiteRow[];
  currency: string;
  loading?: boolean;
  selectedStationId?: string;
  onSelectSite: (stationId: string) => void;
};

const LiveOpsSiteTable: React.FC<Props> = ({
  rows,
  currency,
  loading,
  selectedStationId,
  onSelectSite,
}) => {
  const columns: ColumnsType<LiveOpsSiteRow> = [
    {
      title: "Site",
      key: "name",
      render: (_, row) => (
        <div>
          <Text strong={row.stationId === selectedStationId} style={{ fontSize: 13 }}>
            {row.name}
          </Text>
          <div>
            <Text code style={{ fontSize: 10 }}>
              {row.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Active",
      dataIndex: "activeSessions",
      key: "activeSessions",
      width: 70,
      align: "right",
      render: (n: number) => (n > 0 ? <Tag color="processing">{n}</Tag> : n),
    },
    {
      title: "Started",
      dataIndex: "sessionsStarted",
      key: "sessionsStarted",
      width: 70,
      align: "right",
    },
    {
      title: "Orders",
      dataIndex: "ordersCount",
      key: "ordersCount",
      width: 70,
      align: "right",
    },
    {
      title: "Revenue",
      key: "revenue",
      width: 100,
      align: "right",
      render: (_, row) => formatMoney(row.revenue, currency),
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
    <Card size="small" title="By site" styles={{ body: { padding: 0 } }}>
      <Table<LiveOpsSiteRow>
        size="small"
        rowKey="stationId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        onRow={(row) => ({
          onClick: () => onSelectSite(row.stationId),
          style: { cursor: "pointer" },
        })}
      />
    </Card>
  );
};

export default LiveOpsSiteTable;
