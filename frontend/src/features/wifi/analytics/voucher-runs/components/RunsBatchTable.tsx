"use client";

import React from "react";
import Link from "next/link";
import { Card, Progress, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import type { VoucherRunBatchRow } from "../types";
import { utilizationColor } from "../utils";

const { Text } = Typography;

type Props = {
  rows: VoucherRunBatchRow[];
  loading?: boolean;
  selectedBatchId?: string;
  onSelectBatch?: (batchId: string) => void;
};

const RunsBatchTable: React.FC<Props> = ({
  rows,
  loading,
  selectedBatchId,
  onSelectBatch,
}) => {
  const columns: ColumnsType<VoucherRunBatchRow> = [
    {
      title: "Batch",
      key: "batch",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontFamily: "monospace", fontSize: 13 }}>
            {row.batchNo}
          </Text>
          {row.prefix ? (
            <div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {row.prefix}
              </Text>
            </div>
          ) : null}
        </div>
      ),
    },
    {
      title: "Plan",
      key: "plan",
      width: 140,
      ellipsis: true,
      render: (_, row) => (
        <div>
          <Text style={{ fontSize: 13 }}>{row.planName}</Text>
          <div>
            <Tag style={{ fontFamily: "monospace", fontSize: 11, marginTop: 2 }}>
              {row.planCode}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Issued",
      dataIndex: "quantity",
      key: "quantity",
      width: 70,
      align: "right",
    },
    {
      title: "Utilization",
      key: "utilization",
      width: 140,
      render: (_, row) => (
        <div style={{ minWidth: 100 }}>
          <Progress
            percent={row.utilizationPercent}
            size="small"
            strokeColor={utilizationColor(row.utilizationPercent)}
            format={(p) => `${p}%`}
          />
          <Text type="secondary" style={{ fontSize: 11 }}>
            {row.redeemed} redeemed · {row.remaining} left
          </Text>
        </div>
      ),
      sorter: (a, b) => a.utilizationPercent - b.utilizationPercent,
      defaultSortOrder: "descend",
    },
    {
      title: "Activated",
      dataIndex: "activatedInPeriod",
      key: "activatedInPeriod",
      width: 90,
      align: "right",
    },
    {
      title: "Created",
      key: "createdAt",
      width: 100,
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dayjs(row.createdAt).format("D MMM YY")}
        </Text>
      ),
    },
  ];

  return (
    <Card
      size="small"
      title="Batch utilization"
      extra={
        <Link href="/wifi/access/voucher-runs">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Manage runs →
          </Text>
        </Link>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<VoucherRunBatchRow>
        size="small"
        rowKey="batchId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 10, hideOnSinglePage: true, size: "small" }}
        rowClassName={(row) =>
          row.batchId === selectedBatchId ? "ant-table-row-selected" : ""
        }
        onRow={(row) => ({
          onClick: () => onSelectBatch?.(row.batchId),
          style: { cursor: onSelectBatch ? "pointer" : undefined },
        })}
        scroll={{ x: 720 }}
      />
    </Card>
  );
};

export default RunsBatchTable;
