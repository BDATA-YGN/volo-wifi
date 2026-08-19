"use client";

import React from "react";
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
      sorter: (a, b) => a.batchNo.localeCompare(b.batchNo),
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
      sorter: (a, b) => a.planName.localeCompare(b.planName) || a.planCode.localeCompare(b.planCode),
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
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: "Activated",
      dataIndex: "activatedCount",
      key: "activatedCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.activatedCount - b.activatedCount,
    },
    {
      title: "Remaining",
      dataIndex: "remaining",
      key: "remaining",
      width: 90,
      align: "right",
      sorter: (a, b) => a.remaining - b.remaining,
    },
    {
      title: "Utilization",
      key: "utilization",
      width: 120,
      render: (_, row) => (
        <Progress
          percent={row.utilizationPercent}
          size="small"
          strokeColor={utilizationColor(row.utilizationPercent)}
          format={(p) => `${p}%`}
        />
      ),
      sorter: (a, b) => a.utilizationPercent - b.utilizationPercent,
      defaultSortOrder: "ascend",
    },
    {
      title: "Created",
      key: "createdAt",
      width: 100,
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
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
      styles={{ body: { padding: 0 } }}
    >
      <Table<VoucherRunBatchRow>
        size="small"
        rowKey="batchId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        sticky
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
