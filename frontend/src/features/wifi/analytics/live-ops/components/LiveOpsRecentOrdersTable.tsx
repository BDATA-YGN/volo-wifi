"use client";

import React from "react";
import { Card, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { LiveOpsRecentOrderRow } from "../types";
import { formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: LiveOpsRecentOrderRow[];
  loading?: boolean;
};

const LiveOpsRecentOrdersTable: React.FC<Props> = ({ rows, loading }) => {
  const columns: ColumnsType<LiveOpsRecentOrderRow> = [
    {
      title: "Order",
      dataIndex: "orderNo",
      key: "orderNo",
      render: (orderNo: string) => <Text code style={{ fontSize: 11 }}>{orderNo}</Text>,
    },
    {
      title: "Partner / Site",
      key: "context",
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {row.resellerCode ?? "—"} · {row.stationCode ?? "—"}
        </Text>
      ),
    },
    {
      title: "Total",
      key: "total",
      width: 110,
      align: "right",
      render: (_, row) => formatMoney(row.total, row.currency),
    },
    {
      title: "Sold",
      key: "soldAt",
      width: 130,
      render: (_, row) =>
        dayjs(row.soldAt ?? row.createdAt).format("HH:mm:ss"),
    },
  ];

  return (
    <Card size="small" title="Recent orders" styles={{ body: { padding: 0 } }}>
      <Table<LiveOpsRecentOrderRow>
        size="small"
        rowKey="orderId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        locale={{ emptyText: "No orders in this window" }}
      />
    </Card>
  );
};

export default LiveOpsRecentOrdersTable;
