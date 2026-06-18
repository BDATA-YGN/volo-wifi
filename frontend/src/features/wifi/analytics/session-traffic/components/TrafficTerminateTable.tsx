"use client";

import React from "react";
import { Card, Empty, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { SessionTrafficTerminateRow } from "../types";
import { formatTerminateCause } from "../utils";

const { Text } = Typography;

type Props = {
  rows: SessionTrafficTerminateRow[];
  loading?: boolean;
};

const TrafficTerminateTable: React.FC<Props> = ({ rows, loading }) => {
  const columns: ColumnsType<SessionTrafficTerminateRow> = [
    {
      title: "Terminate cause",
      dataIndex: "cause",
      key: "cause",
      render: (cause: string) => (
        <Text style={{ fontSize: 13 }}>{formatTerminateCause(cause)}</Text>
      ),
    },
    {
      title: "Sessions",
      dataIndex: "count",
      key: "count",
      width: 100,
      align: "right",
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: "descend",
    },
  ];

  return (
    <Card size="small" title="Top disconnect reasons" styles={{ body: { padding: 0 } }}>
      {rows.length === 0 && !loading ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Available when live session data is used"
          style={{ padding: 24 }}
        />
      ) : (
        <Table<SessionTrafficTerminateRow>
          size="small"
          rowKey="cause"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={false}
        />
      )}
    </Card>
  );
};

export default TrafficTerminateTable;
