"use client";

import React from "react";
import { Card, Empty, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { PAYMENT_METHOD_LABEL } from "@/features/wifi/commerce/transactions/orders/constant";
import type { PaymentMethod } from "@/features/wifi/commerce/transactions/orders/types";
import type { PaymentMethodRow } from "../types";
import { formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: PaymentMethodRow[];
  currency: string;
  loading?: boolean;
};

const RevenuePaymentTable: React.FC<Props> = ({ rows, currency, loading }) => {
  const columns: ColumnsType<PaymentMethodRow> = [
    {
      title: "Payment method",
      key: "method",
      render: (_, row) => (
        <Text strong>
          {PAYMENT_METHOD_LABEL[row.method as PaymentMethod] ?? row.method}
        </Text>
      ),
    },
    {
      title: "Payments",
      dataIndex: "paymentsCount",
      key: "paymentsCount",
      width: 100,
      align: "right",
      sorter: (a, b) => a.paymentsCount - b.paymentsCount,
    },
    {
      title: "Amount",
      key: "amount",
      width: 130,
      align: "right",
      render: (_, row) => <Text strong>{formatMoney(row.amount, currency)}</Text>,
      sorter: (a, b) => a.amount - b.amount,
      defaultSortOrder: "descend",
    },
  ];

  return (
    <Card size="small" title="Payments by method" styles={{ body: { padding: 0 } }}>
      <Table<PaymentMethodRow>
        rowKey="method"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        locale={{
          emptyText: (
            <Empty description="No payments in period" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ),
        }}
      />
    </Card>
  );
};

export default RevenuePaymentTable;
