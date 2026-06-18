"use client";

import React from "react";
import { Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { InvoiceListRow } from "../types";
import { INVOICE_STATUS_COLOR } from "../constant";
import { formatDate, formatMoney } from "../../tier-rates/platform/utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: InvoiceListRow[];
  loading?: boolean;
  selectedId?: string | null;
  page: number;
  pageSize: number;
  total: number;
  onSelect: (invoice: InvoiceListRow) => void;
  onPaginationChange: (page: number, pageSize: number) => void;
};

function formatPeriod(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

const InvoicesTable: React.FC<Props> = ({
  data,
  loading,
  selectedId,
  page,
  pageSize,
  total,
  onSelect,
  onPaginationChange,
}) => {
  const columns: ColumnsType<InvoiceListRow> = [
    {
      title: "Invoice",
      dataIndex: "invoiceNo",
      width: 150,
      render: (no: string) => <Text strong code>{no}</Text>,
    },
    {
      title: "Tenant",
      key: "org",
      render: (_, row) => (
        <div>
          <Text>{row.org.name}</Text>
          <div>
            <Text type="secondary" code style={{ fontSize: 11 }}>
              {row.org.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Period",
      key: "period",
      width: 200,
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatPeriod(row.billingPeriodFrom, row.billingPeriodTo)}
        </Text>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 130,
      render: (status: string, row) => (
        <Tag color={row.isOverdue ? "error" : INVOICE_STATUS_COLOR[status] ?? "default"}>
          {row.isOverdue && status !== "OVERDUE" ? "OVERDUE" : status.replace(/_/g, " ")}
        </Tag>
      ),
    },
    {
      title: "Total",
      dataIndex: "totalAmount",
      width: 130,
      align: "right",
      render: (amount: string, row) => <Text strong>{formatMoney(amount, row.currency)}</Text>,
    },
    {
      title: "Balance",
      dataIndex: "balanceDue",
      width: 130,
      align: "right",
      render: (amount: string, row) =>
        Number(amount) > 0 ? (
          <Text type={row.isOverdue ? "danger" : undefined}>
            {formatMoney(amount, row.currency)}
          </Text>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Due",
      dataIndex: "dueDate",
      width: 110,
      render: (v: string) => <Text type="secondary">{formatDate(v)}</Text>,
    },
  ];

  if (!loading && data.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No invoices yet. Monthly SaaS invoices are generated per active site tier."
      />
    );
  }

  return (
    <Table<InvoiceListRow>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "invoice"
      })}
      onRow={(record) => ({
        onClick: () => onSelect(record),
        style: {
          cursor: "pointer",
          background: record.id === selectedId ? "rgba(22, 119, 255, 0.06)" : undefined,
        },
      })}
    />
  );
};

export default InvoicesTable;
