"use client";

import React from "react";
import { Card, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { NasInventoryVendorRow } from "../types";

const { Text } = Typography;

type Props = {
  rows: NasInventoryVendorRow[];
  loading?: boolean;
};

const NasVendorTable: React.FC<Props> = ({ rows, loading }) => {
  const columns: ColumnsType<NasInventoryVendorRow> = [
    {
      title: "Vendor",
      dataIndex: "vendor",
      key: "vendor",
      render: (vendor: string) => <Text strong style={{ fontSize: 13 }}>{vendor}</Text>,
    },
    {
      title: "Devices",
      dataIndex: "count",
      key: "count",
      width: 80,
      align: "right",
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: "descend",
    },
    {
      title: "Models",
      dataIndex: "modelCount",
      key: "modelCount",
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
  ];

  return (
    <Card size="small" title="By vendor" styles={{ body: { padding: 0 } }}>
      <Table<NasInventoryVendorRow>
        size="small"
        rowKey="vendor"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 8, hideOnSinglePage: true, size: "small" }}
        scroll={{ x: 360 }}
      />
    </Card>
  );
};

export default NasVendorTable;
