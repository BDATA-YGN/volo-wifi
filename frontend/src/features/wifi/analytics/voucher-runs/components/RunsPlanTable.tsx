"use client";

import React from "react";
import { Card, Progress, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { VoucherRunPlanRow } from "../types";
import { utilizationColor } from "../utils";

const { Text } = Typography;

type Props = {
  rows: VoucherRunPlanRow[];
  loading?: boolean;
  selectedPlanId?: string;
  onSelectPlan?: (planId: string) => void;
};

const RunsPlanTable: React.FC<Props> = ({ rows, loading, selectedPlanId, onSelectPlan }) => {
  const columns: ColumnsType<VoucherRunPlanRow> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.name}
          </Text>
          <div>
            <Tag style={{ fontFamily: "monospace", fontSize: 11, marginTop: 2 }}>
              {row.code}
            </Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Runs",
      dataIndex: "batchCount",
      key: "batchCount",
      width: 70,
      align: "right",
    },
    {
      title: "Issued",
      dataIndex: "totalIssued",
      key: "totalIssued",
      width: 80,
      align: "right",
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
      defaultSortOrder: "descend",
    },
  ];

  return (
    <Card size="small" title="By plan" styles={{ body: { padding: 0 } }}>
      <Table<VoucherRunPlanRow>
        size="small"
        rowKey="planId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={{ pageSize: 8, hideOnSinglePage: true, size: "small" }}
        rowClassName={(row) => (row.planId === selectedPlanId ? "ant-table-row-selected" : "")}
        onRow={(row) => ({
          onClick: () => onSelectPlan?.(row.planId),
          style: { cursor: onSelectPlan ? "pointer" : undefined },
        })}
        scroll={{ x: 400 }}
      />
    </Card>
  );
};

export default RunsPlanTable;
