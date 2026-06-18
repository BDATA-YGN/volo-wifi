"use client";

import React from "react";
import { Card, Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { InsightsStationRow } from "../types";
import { formatBytes, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: InsightsStationRow[];
  currency: string;
  loading?: boolean;
};

const InsightsStationTable: React.FC<Props> = ({ rows, currency, loading }) => {
  const columns: ColumnsType<InsightsStationRow> = [
    {
      title: "Site",
      key: "station",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.stationName}
          </Text>
          <div>
            <Tag style={{ fontFamily: "monospace", marginTop: 4 }}>{row.stationCode}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Orders",
      dataIndex: "ordersCount",
      key: "orders",
      width: 80,
      align: "right",
    },
    {
      title: "Revenue",
      key: "revenue",
      width: 110,
      align: "right",
      render: (_, row) => <Text strong>{formatMoney(row.revenue, currency)}</Text>,
    },
    {
      title: "Sessions",
      dataIndex: "sessionsCount",
      key: "sessions",
      width: 90,
      align: "right",
    },
    {
      title: "Data",
      key: "bytes",
      width: 90,
      align: "right",
      render: (_, row) => formatBytes(row.totalBytes),
    },
  ];

  return (
    <Card size="small" title="Performance by site" loading={loading} styles={{ body: { padding: 0 } }}>
      <Table<InsightsStationRow>
        rowKey={(r) => r.stationId ?? r.stationCode}
        size="small"
        pagination={false}
        columns={columns}
        dataSource={rows}
        locale={{ emptyText: <Empty description="No site activity" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        scroll={{ x: 480 }}
      />
    </Card>
  );
};

export default InsightsStationTable;
