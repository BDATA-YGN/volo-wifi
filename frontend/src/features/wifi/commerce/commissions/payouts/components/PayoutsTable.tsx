"use client";

import React from "react";
import { Button, Empty, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { formatWifiDate } from "@/features/wifi/shared/format";
import type { PayoutRecord } from "../types";
import { STATUS_COLOR } from "../constant";
import { formatMoney, statusLabel } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: PayoutRecord[];
  currency: string;
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: PayoutRecord) => void;
  onDelete: (record: PayoutRecord) => void;
};

const PayoutsTable: React.FC<Props> = ({
  data,
  currency,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
  onDelete,
}) => {
  const columns: ColumnsType<PayoutRecord> = [
    {
      title: "Partner",
      key: "partner",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.reseller?.name ?? "—"}
          </Text>
          {row.reseller ? (
            <div>
              <Tag style={{ fontFamily: "monospace", marginTop: 4 }}>{row.reseller.code}</Tag>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Period",
      key: "period",
      width: 200,
      render: (_, row) => (
        <Text style={{ fontSize: 13 }}>{row.periodLabel}</Text>
      ),
    },
    {
      title: "Amount",
      key: "amount",
      width: 130,
      align: "right",
      render: (_, row) => (
        <Text strong>{formatMoney(row.amount, currency)}</Text>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      render: (_, row) => (
        <Tag color={STATUS_COLOR[row.status]}>{statusLabel(row.status)}</Tag>
      ),
    },
    {
      title: "Paid",
      key: "paidAt",
      width: 120,
      render: (_, row) =>
        row.paidAt ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatWifiDate(row.paidAt)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_, row) => (
        <Space size="small" onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onView(row)}>
            View
          </Button>
          {row.status === "PENDING" || row.status === "REJECTED" ? (
            <Button type="link" size="small" danger onClick={() => onDelete(row)}>
              Delete
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <Table<PayoutRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      locale={{ emptyText: <Empty description="No commission payouts yet" /> }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "payout"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default PayoutsTable;
