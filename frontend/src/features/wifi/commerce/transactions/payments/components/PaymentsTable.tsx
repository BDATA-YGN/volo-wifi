"use client";

import React from "react";
import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PaymentRecord, SaleStatus } from "../types";
import { formatWifiDateTime } from "@/features/wifi/shared/format";
import { METHOD_COLOR, STATUS_COLOR } from "../constant";
import { formatMethodLabel, formatMoney, formatStatusLabel } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: PaymentRecord[];
  currency: string;
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: PaymentRecord) => void;
};

const PaymentsTable: React.FC<Props> = ({
  data,
  currency,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
}) => {
  const columns: ColumnsType<PaymentRecord> = [
    {
      title: "Paid",
      key: "paidAt",
      width: 180,
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatWifiDateTime(row.paidAt)}
        </Text>
      ),
    },
    {
      title: "Amount",
      key: "amount",
      width: 120,
      align: "right",
      render: (_, row) => (
        <Text strong>{formatMoney(row.amount, row.order?.currency ?? currency)}</Text>
      ),
    },
    {
      title: "Method",
      dataIndex: "method",
      width: 130,
      render: (method: PaymentRecord["method"]) => (
        <Tag color={METHOD_COLOR[method]}>{formatMethodLabel(method)}</Tag>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      render: (_, row) => {
        const status = row.order?.status as SaleStatus | undefined;
        if (!status) return <Text type="secondary">—</Text>;
        return (
          <Tag color={STATUS_COLOR[status] ?? "default"}>{formatStatusLabel(status)}</Tag>
        );
      },
    },
    {
      title: "Order",
      key: "order",
      render: (_, row) =>
        row.order ? (
          <Text code style={{ fontSize: 12 }}>
            {row.order.orderNo}
          </Text>
        ) : (
          "—"
        ),
    },
    {
      title: "Partner",
      key: "reseller",
      width: 140,
      ellipsis: true,
      render: (_, row) =>
        row.order?.reseller ? (
          <Text ellipsis={{ tooltip: row.order.reseller.name }}>{row.order.reseller.name}</Text>
        ) : (
          "—"
        ),
    },
    {
      title: "Ref",
      dataIndex: "refNo",
      width: 100,
      ellipsis: true,
      render: (ref: string | null) =>
        ref ? (
          <Text style={{ fontSize: 12 }}>{ref}</Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_, row) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onView(row)}>
            View
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table<PaymentRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      locale={{ emptyText: <Empty description="No payment records yet" /> }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "payment"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default PaymentsTable;
