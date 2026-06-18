"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { STATUS_COLOR } from "@/features/wifi/commerce/access-tokens/constant";
import { formatStatusLabel } from "@/features/wifi/commerce/access-tokens/utils";
import type { CredentialStatus } from "@/features/wifi/commerce/access-tokens/types";
import type { VoucherRunStatusRow } from "../types";

const { Text } = Typography;

type Props = {
  rows: VoucherRunStatusRow[];
  total: number;
  loading?: boolean;
};

const RunsStatusTable: React.FC<Props> = ({ rows, total, loading }) => {
  const columns: ColumnsType<VoucherRunStatusRow> = [
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Tag color={STATUS_COLOR[status as CredentialStatus] ?? "default"}>
          {formatStatusLabel(status as CredentialStatus)}
        </Tag>
      ),
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
      width: 80,
      align: "right",
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: "descend",
    },
    {
      title: "Share",
      key: "share",
      width: 80,
      align: "right",
      render: (_, row) => (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {total > 0 ? `${Math.round((row.count / total) * 100)}%` : "—"}
        </Text>
      ),
    },
  ];

  return (
    <Card size="small" title="Credential status mix" styles={{ body: { padding: 0 } }}>
      <Table<VoucherRunStatusRow>
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

export default RunsStatusTable;
