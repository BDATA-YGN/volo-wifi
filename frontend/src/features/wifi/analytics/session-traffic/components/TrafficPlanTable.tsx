"use client";

import React from "react";
import { Card, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SessionTrafficPlanRow } from "../types";
import { avgTimePerUserSec, formatBytes, formatDuration } from "../utils";

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
      sorter: (a, b) => a.name.localeCompare(b.name) || a.code.localeCompare(b.code),
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
      title: "Users",
      dataIndex: "uniqueCredentials",
      key: "uniqueCredentials",
      width: 80,
      align: "right",
      sorter: (a, b) => a.uniqueCredentials - b.uniqueCredentials,
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
      title: "Avg / user",
      key: "avgTime",
      width: 100,
      align: "right",
      sorter: (a, b) =>
        avgTimePerUserSec(a.totalSessionTimeSec, a.uniqueCredentials) -
        avgTimePerUserSec(b.totalSessionTimeSec, b.uniqueCredentials),
      render: (_, row) => formatDuration(avgTimePerUserSec(row.totalSessionTimeSec, row.uniqueCredentials)),
    },
  ];

  return (
    <Card
      size="small"
      title="By plan"
      styles={{ body: { padding: 0 } }}
    >
      <Table<SessionTrafficPlanRow>
        size="small"
        rowKey="planId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        sticky
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
