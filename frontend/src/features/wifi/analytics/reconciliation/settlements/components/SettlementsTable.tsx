"use client";

import React from "react";
import Link from "next/link";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { SettlementRow } from "../types";
import { STATUS_COLOR } from "../constant";
import { formatMoney, formatStatusLabel, formatVariance } from "../utils";
import type { SettlementStatus } from "../types";

const { Text } = Typography;

type Props = {
  rows: SettlementRow[];
  currency: string;
  loading?: boolean;
  onView: (row: SettlementRow) => void;
};

const SettlementsTable: React.FC<Props> = ({ rows, currency, loading, onView }) => {
  const columns: ColumnsType<SettlementRow> = [
    {
      title: "Period",
      key: "period",
      width: 150,
      render: (_, row) => (
        <div style={{ fontSize: 12 }}>
          <div>{dayjs(row.periodStart).format("D MMM YYYY")}</div>
          <Text type="secondary">{dayjs(row.periodEnd).format("D MMM YYYY")}</Text>
        </div>
      ),
    },
    {
      title: "Partner / Site",
      key: "scope",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.resellerName}
          </Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {row.stationCode} · {row.stationName}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: SettlementStatus) => (
        <Tag color={STATUS_COLOR[status] ?? "default"}>{formatStatusLabel(status)}</Tag>
      ),
    },
    {
      title: "System",
      key: "systemTotal",
      width: 110,
      align: "right",
      render: (_, row) => formatMoney(row.systemTotal, row.systemCurrency || currency),
      sorter: (a, b) => a.systemTotal - b.systemTotal,
      defaultSortOrder: "descend",
    },
    {
      title: "Declared",
      key: "declared",
      width: 110,
      align: "right",
      render: (_, row) =>
        row.declaredTotal != null
          ? formatMoney(row.declaredTotal, row.declaredCurrency || currency)
          : "—",
    },
    {
      title: "Variance",
      key: "variance",
      width: 110,
      align: "right",
      render: (_, row) => (
        <Text
          type={
            row.variance != null && Math.abs(row.variance) > 0.009 ? "warning" : "secondary"
          }
        >
          {formatVariance(row.variance, row.systemCurrency || currency)}
        </Text>
      ),
    },
    {
      title: "",
      key: "posted",
      width: 70,
      render: (_, row) =>
        row.hasPosting ? <Tag color="purple">Posted</Tag> : null,
    },
  ];

  return (
    <Card
      size="small"
      title="Settlement ledger"
      extra={
        <Link href="/wifi/analytics/reconciliation/approvals">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Approvals →
          </Text>
        </Link>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<SettlementRow>
        size="small"
        rowKey="settlementId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 10, showSizeChanger: rows.length > 10, size: "small" }}
        onRow={(row) => ({
          onClick: () => onView(row),
          style: { cursor: "pointer" },
        })}
        scroll={{ x: 960 }}
      />
    </Card>
  );
};

export default SettlementsTable;
