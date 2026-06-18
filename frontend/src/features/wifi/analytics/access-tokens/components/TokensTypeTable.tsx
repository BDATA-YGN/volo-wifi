"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CredentialTypeRow } from "../types";
import { formatCredentialType } from "../utils";

const { Text } = Typography;

type Props = {
  rows: CredentialTypeRow[];
  loading?: boolean;
};

const TokensTypeTable: React.FC<Props> = ({ rows, loading }) => {
  const columns: ColumnsType<CredentialTypeRow> = [
    {
      title: "Type",
      key: "type",
      render: (_, row) => (
        <Tag color={row.type === "VOUCHER_TOKEN" ? "blue" : "purple"}>
          {formatCredentialType(row.type)}
        </Tag>
      ),
    },
    {
      title: "Inventory",
      dataIndex: "inventoryCount",
      key: "inventoryCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.inventoryCount - b.inventoryCount,
    },
    {
      title: "Active",
      dataIndex: "activeCount",
      key: "activeCount",
      width: 80,
      align: "right",
      sorter: (a, b) => a.activeCount - b.activeCount,
    },
    {
      title: "Sold",
      dataIndex: "soldInPeriod",
      key: "soldInPeriod",
      width: 70,
      align: "right",
      sorter: (a, b) => a.soldInPeriod - b.soldInPeriod,
      defaultSortOrder: "descend",
    },
  ];

  return (
    <Card size="small" title="By credential type" styles={{ body: { padding: 0 } }}>
      <Table<CredentialTypeRow>
        rowKey="type"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
      />
    </Card>
  );
};

export default TokensTypeTable;
