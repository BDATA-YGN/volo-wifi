"use client";

import React from "react";
import { Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { InvoicePayment } from "../types";
import { formatDateTime, formatMoney } from "../../tier-rates/platform/utils";

const { Text } = Typography;

type Props = {
  payments: InvoicePayment[];
  currency: string;
  loading?: boolean;
};

const InvoicePaymentsPanel: React.FC<Props> = ({ payments, currency, loading }) => {
  const columns: ColumnsType<InvoicePayment> = [
    {
      title: "Date",
      dataIndex: "paymentDate",
      width: 160,
      render: (v: string) => formatDateTime(v),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      width: 120,
      render: (v: string) => <Text strong>{formatMoney(v, currency)}</Text>,
    },
    {
      title: "Method",
      dataIndex: "paymentMethod",
      width: 130,
      render: (v: string) => <Tag>{v.replace(/_/g, " ")}</Tag>,
    },
    {
      title: "Reference",
      dataIndex: "refNo",
      render: (v: string | null) => v || <Text type="secondary">—</Text>,
    },
    {
      title: "Received by",
      key: "admin",
      width: 130,
      render: (_, row) => (
        <Text style={{ fontSize: 12 }}>
          {row.receivedByAdmin.fullName || row.receivedByAdmin.username}
        </Text>
      ),
    },
  ];

  if (!loading && payments.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No payments recorded for this invoice."
      />
    );
  }

  return (
    <Table<InvoicePayment>
      rowKey="id"
      size="small"
      loading={loading}
      columns={columns}
      dataSource={payments}
      pagination={false}
    />
  );
};

export default InvoicePaymentsPanel;
