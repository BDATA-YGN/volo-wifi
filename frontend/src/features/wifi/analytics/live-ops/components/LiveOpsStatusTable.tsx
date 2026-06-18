"use client";

import React from "react";
import { Card, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { LiveOpsStatusRow } from "../types";
import { SESSION_STATUS_COLOR } from "../constant";
import { formatSessionStatus } from "../utils";

type Props = {
  rows: LiveOpsStatusRow[];
  loading?: boolean;
};

const LiveOpsStatusTable: React.FC<Props> = ({ rows, loading }) => {
  const columns: ColumnsType<LiveOpsStatusRow> = [
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={SESSION_STATUS_COLOR[status] ?? "default"}>{formatSessionStatus(status)}</Tag>
      ),
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
      width: 80,
      align: "right",
    },
  ];

  return (
    <Card size="small" title="Session status" styles={{ body: { padding: 0 } }}>
      <Table<LiveOpsStatusRow>
        size="small"
        rowKey="status"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
      />
    </Card>
  );
};

export default LiveOpsStatusTable;
