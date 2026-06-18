"use client";

import React from "react";
import { Card, Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { STATUS_COLOR } from "@/features/wifi/commerce/transactions/orders/constant";
import type { SaleStatus } from "@/features/wifi/commerce/transactions/orders/types";
import { formatStatusLabel } from "@/features/wifi/commerce/transactions/orders/utils";
import type { OrderStatusRow } from "../types";
import { formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: OrderStatusRow[];
  currency: string;
  loading?: boolean;
};

const RevenueOrderStatusTable: React.FC<Props> = ({ rows, currency, loading }) => {
  const columns: ColumnsType<OrderStatusRow> = [
    {
      title: "Order status",
      key: "status",
      render: (_, row) => (
        <Tag color={STATUS_COLOR[row.status as SaleStatus] ?? "default"}>
          {formatStatusLabel(row.status)}
        </Tag>
      ),
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
      render: (_, row) =>
        row.revenue > 0 ? (
          <Text strong>{formatMoney(row.revenue, currency)}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
      sorter: (a, b) => a.revenue - b.revenue,
    },
  ];

  return (
    <Card size="small" title="Orders by status" styles={{ body: { padding: 0 } }}>
      <Table<OrderStatusRow>
        rowKey="status"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        locale={{
          emptyText: (
            <Empty description="No orders in period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ),
        }}
      />
    </Card>
  );
};

export default RevenueOrderStatusTable;
