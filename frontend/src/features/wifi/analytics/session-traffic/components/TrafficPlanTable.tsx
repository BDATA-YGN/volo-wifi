"use client";

import React from "react";
import Link from "next/link";
import { Card, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SessionTrafficPlanRow } from "../types";
import { formatBytes, formatDuration } from "../utils";

const { Text } = Typography;

type Props = {
  rows: SessionTrafficPlanRow[];
  loading?: boolean;
  selectedPlanId?: string;
  onSelectPlan?: (planId: string) => void;
};

const TrafficPlanTable: React.FC<Props> = ({
  rows,
  loading,
  selectedPlanId,
  onSelectPlan,
}) => {
  const columns: ColumnsType<SessionTrafficPlanRow> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.name}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
            {row.code}
          </Text>
        </div>
      ),
    },
    {
      title: "Sessions",
      dataIndex: "sessionsCount",
      key: "sessionsCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.sessionsCount - b.sessionsCount,
      defaultSortOrder: "descend",
    },
    {
      title: "Data",
      key: "totalBytes",
      width: 100,
      align: "right",
      render: (_, row) => formatBytes(row.totalBytes),
      sorter: (a, b) => a.totalBytes - b.totalBytes,
    },
    {
      title: "Avg time",
      key: "avgTime",
      width: 90,
      align: "right",
      render: (_, row) =>
        formatDuration(
          row.sessionsCount > 0
            ? Math.round(row.totalSessionTimeSec / row.sessionsCount)
            : 0
        ),
    },
  ];

  return (
    <Card
      size="small"
      title="By plan"
      extra={
        <Link href="/wifi/analytics/service-plans">
          <Text type="secondary" style={{ fontSize: 12 }}>
            Plan analytics →
          </Text>
        </Link>
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<SessionTrafficPlanRow>
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

export default TrafficPlanTable;
