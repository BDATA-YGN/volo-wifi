"use client";

import React from "react";
import { Button, Empty, Progress, Space, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { formatWifiDateTime } from "@/features/wifi/shared/format";
import type { VoucherBatchRecord } from "../types";
import { canCancelVoucherRun, redemptionPercent } from "../utils";
import { buildWifiTablePagination } from "@/features/wifi/shared/pagination";

const { Text } = Typography;

type Props = {
  data: VoucherBatchRecord[];
  loading?: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPaginationChange: (page: number, pageSize: number) => void;
  onView: (record: VoucherBatchRecord) => void;
  onCancel: (record: VoucherBatchRecord) => void;
};

const VoucherRunsTable: React.FC<Props> = ({
  data,
  loading,
  page,
  pageSize,
  total,
  onPaginationChange,
  onView,
  onCancel,
}) => {
  const columns: ColumnsType<VoucherBatchRecord> = [
    {
      title: "Batch",
      key: "batch",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontFamily: "monospace" }}>
            {row.batchNo}
          </Text>
          {row.prefix ? (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Prefix {row.prefix}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Plan",
      key: "plan",
      width: 160,
      ellipsis: true,
      render: (_, row) => (
        <div>
          <Text>{row.plan.name}</Text>
          <div>
            <Text code style={{ fontSize: 11 }}>
              {row.plan.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Site",
      key: "site",
      width: 130,
      ellipsis: true,
      render: (_, row) =>
        row.station ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {row.station.code}
          </Text>
        ) : (
          <Text type="secondary">Any site</Text>
        ),
    },
    {
      title: "Created by",
      key: "createdBy",
      width: 140,
      ellipsis: true,
      render: (_, row) =>
        row.createdByAdmin ? (
          <div>
            <Text style={{ fontSize: 12 }}>{row.createdByAdmin.fullName}</Text>
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                @{row.createdByAdmin.username}
              </Text>
            </div>
          </div>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: "Quantity",
      key: "qty",
      width: 100,
      align: "center",
      render: (_, row) => (
        <Text style={{ fontVariantNumeric: "tabular-nums" }}>{row.quantity}</Text>
      ),
    },
    {
      title: "Redemption",
      key: "redemption",
      width: 140,
      render: (_, row) => {
        const pct = redemptionPercent(row.issued, row.remainingQuantity);
        return (
          <div style={{ minWidth: 100 }}>
            <Progress
              percent={pct}
              size="small"
              format={() => `${row.remainingQuantity} left`}
            />
          </div>
        );
      },
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      width: 120,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatWifiDateTime(v)}
        </Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 140,
      align: "right",
      fixed: "right",
      render: (_, row) => (
        <Space size={0} onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => onView(row)}>
            View
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={!canCancelVoucherRun(row)}
            onClick={() => onCancel(row)}
          >
            Cancel
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table<VoucherBatchRecord>
      rowKey="id"
      size="middle"
      loading={loading}
      columns={columns}
      dataSource={data}
      scroll={{ x: 1180 }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No voucher runs yet — generate a batch of prepaid tokens for distribution."
          />
        ),
      }}
      pagination={buildWifiTablePagination({
        page,
        pageSize,
        total,
        onChange: onPaginationChange,
        itemLabel: "run"
      })}
      onRow={(record) => ({
        onClick: () => onView(record),
        style: { cursor: "pointer" },
      })}
    />
  );
};

export default VoucherRunsTable;
