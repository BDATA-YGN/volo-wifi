"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { ColumnsType } from "antd/es/table";
import type { LiveOpsSiteRow } from "../types";
import { formatBytes, formatCount, formatSessionStatus } from "../utils";
import { SESSION_STATUS_COLOR, TOKEN_STATUS_COLOR, TOKEN_STATUS_LABEL } from "../constant";

const { Text } = Typography;

type Props = {
  rows: LiveOpsSiteRow[];
  loading?: boolean;
  selectedStationId?: string;
  onSelectSite: (stationId: string) => void;
};

function countCell(value: number, status?: string) {
  const label = formatCount(value);
  if (value <= 0) return <Text type="secondary">{label}</Text>;
  if (!status) return label;
  return <Tag color={SESSION_STATUS_COLOR[status] ?? "default"}>{label}</Tag>;
}

const LiveOpsSiteTable: React.FC<Props> = ({
  rows,
  loading,
  selectedStationId,
  onSelectSite,
}) => {
  const columns: ColumnsType<LiveOpsSiteRow> = [
    {
      title: "Site",
      key: "name",
      fixed: "left",
      width: 220,
      sorter: (a, b) => a.name.localeCompare(b.name),
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
      title: formatSessionStatus("START"),
      dataIndex: "radiusStart",
      key: "radiusStart",
      width: 100,
      align: "right",
      sorter: (a, b) => a.radiusStart - b.radiusStart,
      render: (n: number) => countCell(n, "START"),
    },
    {
      title: formatSessionStatus("INTERIM"),
      dataIndex: "radiusInterim",
      key: "radiusInterim",
      width: 100,
      align: "right",
      sorter: (a, b) => a.radiusInterim - b.radiusInterim,
      render: (n: number) => countCell(n, "INTERIM"),
    },
    {
      title: formatSessionStatus("STOP"),
      dataIndex: "radiusStop",
      key: "radiusStop",
      width: 110,
      align: "right",
      sorter: (a, b) => a.radiusStop - b.radiusStop,
      render: (n: number) => countCell(n, "STOP"),
    },
    {
      title: "Token status",
      key: "tokenStatus",
      sorter: (a, b) =>
        a.tokenStatus.reduce((sum, item) => sum + item.count, 0) -
        b.tokenStatus.reduce((sum, item) => sum + item.count, 0),
      render: (_, row) =>
        row.tokenStatus.length === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.tokenStatus.map((item) => (
              <Tag key={item.status} color={TOKEN_STATUS_COLOR[item.status] ?? "default"}>
                {TOKEN_STATUS_LABEL[item.status] ?? item.status} {formatCount(item.count)}
              </Tag>
            ))}
          </div>
        ),
    },
    {
      title: "Traffic",
      key: "totalBytes",
      width: 120,
      align: "right",
      sorter: (a, b) => a.totalBytes - b.totalBytes,
      defaultSortOrder: "descend",
      render: (_, row) => formatBytes(row.totalBytes),
    },
  ];

  return (
    <Card
      size="small"
      title="By site"
      extra={
        <WifiMutedText style={{ fontSize: 12 }}>
          Token status is for the selected day only
        </WifiMutedText>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<LiveOpsSiteRow>
        size="small"
        rowKey="stationId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        sticky
        scroll={{ x: 900, y: "calc(var(--content-body-height) - 280px)" }}
        onRow={(row) => ({
          onClick: () => onSelectSite(row.stationId),
          style: { cursor: "pointer" },
        })}
      />
    </Card>
  );
};

export default LiveOpsSiteTable;
