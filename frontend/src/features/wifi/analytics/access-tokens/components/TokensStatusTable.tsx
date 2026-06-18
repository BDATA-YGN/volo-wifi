"use client";

import React from "react";
import { Card, Progress, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { STATUS_COLOR } from "@/features/wifi/commerce/access-tokens/constant";
import { formatStatusLabel } from "@/features/wifi/commerce/access-tokens/utils";
import type { CredentialStatus } from "@/features/wifi/commerce/access-tokens/types";
import type { CredentialStatusRow } from "../types";

const { Text } = Typography;

type Props = {
  rows: CredentialStatusRow[];
  inventoryTotal: number;
  loading?: boolean;
};

const TokensStatusTable: React.FC<Props> = ({ rows, inventoryTotal, loading }) => {
  const columns: ColumnsType<CredentialStatusRow> = [
    {
      title: "Status",
      key: "status",
      render: (_, row) => (
        <Tag color={STATUS_COLOR[row.status as CredentialStatus] ?? "default"}>
          {formatStatusLabel(row.status)}
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
      width: 160,
      render: (_, row) => {
        const pct = inventoryTotal > 0 ? Math.round((row.count / inventoryTotal) * 100) : 0;
        return (
          <div className="flex items-center gap-2">
            <Progress
              percent={pct}
              size="small"
              showInfo={false}
              strokeColor={STATUS_COLOR[row.status as CredentialStatus] === "error" ? "#ff4d4f" : undefined}
              style={{ flex: 1, margin: 0 }}
            />
            <Text type="secondary" style={{ fontSize: 12, minWidth: 32 }}>
              {pct}%
            </Text>
          </div>
        );
      },
    },
  ];

  return (
    <Card size="small" title="Current inventory by status" styles={{ body: { padding: 0 } }}>
      <Table<CredentialStatusRow>
        rowKey="status"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
      />
    </Card>
  );
};

export default TokensStatusTable;
