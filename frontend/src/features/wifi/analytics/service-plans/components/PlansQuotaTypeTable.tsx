"use client";

import React from "react";
import { Card, Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { PlanQuotaTypeRow } from "../types";
import { formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: PlanQuotaTypeRow[];
  currency: string;
  loading?: boolean;
};

const PlansQuotaTypeTable: React.FC<Props> = ({
  rows,
  currency,
  loading,
}) => {
  const columns: ColumnsType<PlanQuotaTypeRow> = [
    {
      title: "Tier",
      key: "tier",
      render: (_, row) => `${row.tierCode} — ${row.tierName}`,
    },
    {
      title: "Sites",
      dataIndex: "siteCount",
      width: 100,
      align: "right",
      sorter: (a, b) => a.siteCount - b.siteCount,
    },
    {
      title: "Tokens",
      dataIndex: "itemsCount",
      key: "itemsCount",
      width: 80,
      align: "right",
      sorter: (a, b) => a.itemsCount - b.itemsCount,
    },
    {
      title: "Revenue",
      key: "revenue",
      width: 120,
      align: "right",
      render: (_, row) => <Text strong>{formatMoney(row.revenue, currency)}</Text>,
      sorter: (a, b) => a.revenue - b.revenue,
      defaultSortOrder: "descend",
    },
  ];

  return (
    <Card size="small" title="Uptake by tier" styles={{ body: { padding: 0 } }}>
      <Table<PlanQuotaTypeRow>
        rowKey={(row) => row.tierId ?? row.tierCode}
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 480 }}
      />
    </Card>
  );
};

export default PlansQuotaTypeTable;
