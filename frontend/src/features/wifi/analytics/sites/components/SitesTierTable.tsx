"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SiteTierRow } from "../types";
import { formatBytes, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: SiteTierRow[];
  currency: string;
  loading?: boolean;
  onSelectTier?: (stationSizeId: string) => void;
  selectedTierId?: string | null;
};

const SitesTierTable: React.FC<Props> = ({
  rows,
  currency,
  loading,
  onSelectTier,
  selectedTierId,
}) => {
  const columns: ColumnsType<SiteTierRow> = [
    {
      title: "Capacity tier",
      key: "tier",
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          <div>
            <Tag style={{ fontFamily: "monospace", marginTop: 4 }}>{row.code}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Sites",
      key: "sites",
      width: 100,
      align: "right",
      render: (_, row) => (
        <span>
          {row.activeSiteCount}
          <Text type="secondary"> / {row.siteCount}</Text>
        </span>
      ),
      sorter: (a, b) => a.siteCount - b.siteCount,
    },
    {
      title: "Orders",
      dataIndex: "ordersCount",
      key: "ordersCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.ordersCount - b.ordersCount,
    },
    {
      title: "Revenue",
      key: "revenue",
      width: 120,
      align: "right",
      render: (_, row) => <Text strong>{formatMoney(row.revenue, currency)}</Text>,
      sorter: (a, b) => a.revenue - b.revenue,
      defaultSortOrder: "descend",
    },
    {
      title: "Sessions",
      dataIndex: "sessionsCount",
      key: "sessionsCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.sessionsCount - b.sessionsCount,
    },
    {
      title: "Data",
      key: "totalBytes",
      width: 90,
      align: "right",
      render: (_, row) => formatBytes(row.totalBytes),
      sorter: (a, b) => a.totalBytes - b.totalBytes,
    },
  ];

  return (
    <Card size="small" title="Performance by tier" styles={{ body: { padding: 0 } }}>
      <Table<SiteTierRow>
        rowKey="stationSizeId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 560 }}
        onRow={(row) => ({
          onClick: onSelectTier ? () => onSelectTier(row.stationSizeId) : undefined,
          style: {
            cursor: onSelectTier ? "pointer" : undefined,
            background:
              selectedTierId === row.stationSizeId ? "rgba(22, 119, 255, 0.06)" : undefined,
          },
        })}
      />
    </Card>
  );
};

export default SitesTierTable;
