"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SiteInventoryTierRow } from "../types";

const { Text } = Typography;

type Props = {
  rows: SiteInventoryTierRow[];
  loading?: boolean;
  selectedTierId?: string;
  onSelectTier?: (stationSizeId: string) => void;
};

const InventoryTierTable: React.FC<Props> = ({
  rows,
  loading,
  selectedTierId,
  onSelectTier,
}) => {
  const columns: ColumnsType<SiteInventoryTierRow> = [
    {
      title: "Tier",
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
          {row.activeCount}
          <Text type="secondary"> / {row.siteCount}</Text>
        </span>
      ),
      sorter: (a, b) => a.siteCount - b.siteCount,
      defaultSortOrder: "descend",
    },
    {
      title: "Devices",
      dataIndex: "deviceCount",
      key: "deviceCount",
      width: 80,
      align: "right",
    },
    {
      title: "RADIUS",
      dataIndex: "radiusClientCount",
      key: "radiusClientCount",
      width: 80,
      align: "right",
    },
    {
      title: "Maint.",
      dataIndex: "maintenanceCount",
      key: "maintenanceCount",
      width: 70,
      align: "right",
    },
  ];

  return (
    <Card size="small" title="By capacity tier" styles={{ body: { padding: 0 } }}>
      <Table<SiteInventoryTierRow>
        size="small"
        rowKey="stationSizeId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 8, hideOnSinglePage: true, size: "small" }}
        rowClassName={(row) =>
          row.stationSizeId === selectedTierId ? "ant-table-row-selected" : ""
        }
        onRow={(row) => ({
          onClick: () => onSelectTier?.(row.stationSizeId),
          style: { cursor: onSelectTier ? "pointer" : undefined },
        })}
        scroll={{ x: 420 }}
      />
    </Card>
  );
};

export default InventoryTierTable;
