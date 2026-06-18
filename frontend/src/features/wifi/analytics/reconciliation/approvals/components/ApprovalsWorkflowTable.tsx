"use client";

import React from "react";
import { Card, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { ApprovalWorkflowRow } from "../types";
import { STATUS_COLOR } from "../constant";
import { formatStatusLabel } from "../utils";
import type { WorkflowStatus } from "../types";

type Props = {
  rows: ApprovalWorkflowRow[];
  loading?: boolean;
};

const WORKFLOW_ORDER: WorkflowStatus[] = [
  "DRAFT",
  "DECLARED",
  "STATION_ATTESTED",
  "ORG_APPROVED",
  "POSTED",
  "REJECTED",
];

const ApprovalsWorkflowTable: React.FC<Props> = ({ rows, loading }) => {
  const sorted = [...rows].sort((a, b) => {
    const ai = WORKFLOW_ORDER.indexOf(a.status as WorkflowStatus);
    const bi = WORKFLOW_ORDER.indexOf(b.status as WorkflowStatus);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const columns: ColumnsType<ApprovalWorkflowRow> = [
    {
      title: "Workflow step",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={STATUS_COLOR[status as WorkflowStatus] ?? "default"}>
          {formatStatusLabel(status)}
        </Tag>
      ),
    },
    {
      title: "Settlements",
      dataIndex: "count",
      key: "count",
      width: 100,
      align: "right",
    },
  ];

  return (
    <Card size="small" title="Workflow funnel" styles={{ body: { padding: 0 } }}>
      <Table<ApprovalWorkflowRow>
        size="small"
        rowKey="status"
        loading={loading}
        dataSource={sorted}
        columns={columns}
        pagination={false}
      />
    </Card>
  );
};

export default ApprovalsWorkflowTable;
