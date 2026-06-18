"use client";

import React from "react";
import { Card, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SiteInventoryDeviceTypeRow } from "../types";
import { formatDeviceType } from "../utils";

const { Text } = Typography;

type Props = {
  rows: SiteInventoryDeviceTypeRow[];
  loading?: boolean;
};

const InventoryDeviceTypeTable: React.FC<Props> = ({ rows, loading }) => {
  const columns: ColumnsType<SiteInventoryDeviceTypeRow> = [
    {
      title: "Device type",
      dataIndex: "type",
      key: "type",
      render: (type: string) => <Text style={{ fontSize: 13 }}>{formatDeviceType(type)}</Text>,
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
      width: 80,
      align: "right",
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: "descend",
    },
    {
      title: "RADIUS",
      dataIndex: "radiusClientCount",
      key: "radiusClientCount",
      width: 80,
      align: "right",
    },
  ];

  return (
    <Card size="small" title="Device fleet mix" styles={{ body: { padding: 0 } }}>
      <Table<SiteInventoryDeviceTypeRow>
        size="small"
        rowKey="type"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
      />
    </Card>
  );
};

export default InventoryDeviceTypeTable;
