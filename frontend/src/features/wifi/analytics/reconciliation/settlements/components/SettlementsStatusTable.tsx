"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SettlementStatusRow } from "../types";
import { STATUS_COLOR } from "../constant";
import { formatMoney, formatStatusLabel } from "../utils";
import type { SettlementStatus } from "../types";

const { Text } = Typography;

type Props = {
  rows: SettlementStatusRow[];
  currency: string;
  loading?: boolean;
};

const SettlementsStatusTable: React.FC<Props> = ({ rows, currency, loading }) => {
  const columns: ColumnsType<SettlementStatusRow> = [
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={STATUS_COLOR[status as SettlementStatus] ?? "default"}>
          {formatStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
      width: 70,
      align: "right",
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: "descend",
    },
    {
      title: "System",
      key: "systemTotal",
      width: 110,
      align: "right",
      render: (_, row) => formatMoney(row.systemTotal, currency),
    },
  ];

  return (
    <Card size="small" title="By status" styles={{ body: { padding: 0 } }}>
      <Table<SettlementStatusRow>
        size="small"
        rowKey="status"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
      />
    </Card>
  );
};

export default SettlementsStatusTable;
