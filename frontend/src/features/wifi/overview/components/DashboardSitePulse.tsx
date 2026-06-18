"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { OverviewSitePulse } from "../types";
import { formatBytes, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: OverviewSitePulse[];
  currency: string;
  loading?: boolean;
};

const DashboardSitePulse: React.FC<Props> = ({ rows, currency, loading }) => {
  const columns: ColumnsType<OverviewSitePulse> = [
    {
      title: "Site",
      key: "name",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
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
      title: "Live",
      dataIndex: "activeSessions",
      key: "activeSessions",
      width: 70,
      align: "right",
      render: (n: number) => (n > 0 ? <Tag color="processing">{n}</Tag> : n),
    },
    {
      title: "Today sessions",
      dataIndex: "todaySessions",
      key: "todaySessions",
      width: 100,
      align: "right",
    },
    {
      title: "Revenue",
      key: "todayRevenue",
      width: 100,
      align: "right",
      render: (_, row) => formatMoney(row.todayRevenue, currency),
    },
    {
      title: "Traffic",
      key: "todayBytes",
      width: 90,
      align: "right",
      render: (_, row) => formatBytes(row.todayBytes),
    },
  ];

  return (
    <Card size="small" title="Site pulse" styles={{ body: { padding: 0 } }}>
      <Table<OverviewSitePulse>
        size="small"
        rowKey="stationId"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={false}
        locale={{ emptyText: "No site activity today" }}
      />
    </Card>
  );
};

export default DashboardSitePulse;
