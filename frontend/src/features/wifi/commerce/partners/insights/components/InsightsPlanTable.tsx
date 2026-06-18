"use client";

import React from "react";
import { Card, Empty, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { InsightsPlanRow } from "../types";
import { formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: InsightsPlanRow[];
  currency: string;
  loading?: boolean;
};

const InsightsPlanTable: React.FC<Props> = ({ rows, currency, loading }) => {
  const columns: ColumnsType<InsightsPlanRow> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, row) => (
        <div>
          <Text strong style={{ fontSize: 13 }}>
            {row.planName}
          </Text>
          <div>
            <Tag style={{ fontFamily: "monospace", marginTop: 4 }}>{row.planCode}</Tag>
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
      title: "Tokens",
      dataIndex: "itemsCount",
      key: "items",
      width: 80,
      align: "right",
    },
    {
      title: "Revenue",
      key: "revenue",
      width: 120,
      align: "right",
      render: (_, row) => <Text strong>{formatMoney(row.revenue, currency)}</Text>,
    },
    {
      title: "Commission",
      key: "commission",
      width: 120,
      align: "right",
      render: (_, row) => formatMoney(row.commission, currency),
    },
  ];

  return (
    <Card size="small" title="Revenue by plan" loading={loading} styles={{ body: { padding: 0 } }}>
      <Table<InsightsPlanRow>
        rowKey={(r) => r.planId ?? r.planCode}
        size="small"
        pagination={false}
        columns={columns}
        dataSource={rows}
        locale={{ emptyText: <Empty description="No plan sales" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        scroll={{ x: 480 }}
      />
    </Card>
  );
};

export default InsightsPlanTable;
