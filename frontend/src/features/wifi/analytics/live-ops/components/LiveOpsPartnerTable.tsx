"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { LiveOpsPartnerRow } from "../types";
import { formatBytes, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: LiveOpsPartnerRow[];
  currency: string;
  loading?: boolean;
  selectedResellerId?: string;
  onSelectPartner: (resellerId: string) => void;
};

const LiveOpsPartnerTable: React.FC<Props> = ({
  rows,
  currency,
  loading,
  selectedResellerId,
  onSelectPartner,
}) => {
  const columns: ColumnsType<LiveOpsPartnerRow> = [
    {
      title: "Partner",
      key: "name",
      render: (_, row) => (
        <div>
          <Text strong={row.resellerId === selectedResellerId} style={{ fontSize: 13 }}>
            {row.name}
          </Text>
          <div>
            <Text code style={{ fontSize: 10 }}>
              {row.code}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: "Active",
      dataIndex: "activeSessions",
      key: "activeSessions",
      width: 70,
      align: "right",
      render: (n: number) => (n > 0 ? <Tag color="processing">{n}</Tag> : n),
    },
    {
      title: "Started",
      dataIndex: "sessionsStarted",
      key: "sessionsStarted",
      width: 70,
      align: "right",
    },
    {
      title: "Orders",
      dataIndex: "ordersCount",
      key: "ordersCount",
      width: 70,
      align: "right",
    },
    {
      title: "Revenue",
      key: "revenue",
      width: 100,
      align: "right",
      render: (_, row) => formatMoney(row.revenue, currency),
    },
    {
      title: "Traffic",
      key: "totalBytes",
      width: 90,
      align: "right",
      render: (_, row) => formatBytes(row.totalBytes),
    },
  ];

  return (
    <Card size="small" title="By partner" styles={{ body: { padding: 0 } }}>
      <Table<LiveOpsPartnerRow>
        size="small"
        rowKey="resellerId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        onRow={(row) => ({
          onClick: () => onSelectPartner(row.resellerId),
          style: { cursor: "pointer" },
        })}
      />
    </Card>
  );
};

export default LiveOpsPartnerTable;
