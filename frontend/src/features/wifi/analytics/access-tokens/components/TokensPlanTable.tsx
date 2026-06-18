"use client";

import React from "react";
import Link from "next/link";
import { Button, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import type { CredentialPlanRow } from "../types";

const { Text } = Typography;

type Props = {
  rows: CredentialPlanRow[];
  loading?: boolean;
  onSelectPlan?: (planId: string) => void;
  selectedPlanId?: string | null;
};

const TokensPlanTable: React.FC<Props> = ({ rows, loading, onSelectPlan, selectedPlanId }) => {
  const columns: ColumnsType<CredentialPlanRow> = [
    {
      title: "Plan",
      key: "plan",
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          <div>
            <Tag style={{ fontFamily: "monospace", marginTop: 4 }}>{row.code}</Tag>
          </div>
        </div>
      ),
    },
    {
      title: "Inventory",
      dataIndex: "inventoryCount",
      key: "inventoryCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.inventoryCount - b.inventoryCount,
      defaultSortOrder: "descend",
    },
    {
      title: "Active",
      dataIndex: "activeCount",
      key: "activeCount",
      width: 80,
      align: "right",
      sorter: (a, b) => a.activeCount - b.activeCount,
    },
    {
      title: "Sold",
      dataIndex: "soldInPeriod",
      key: "soldInPeriod",
      width: 70,
      align: "right",
      sorter: (a, b) => a.soldInPeriod - b.soldInPeriod,
    },
    {
      title: "Expired",
      dataIndex: "expiredInPeriod",
      key: "expiredInPeriod",
      width: 80,
      align: "right",
      sorter: (a, b) => a.expiredInPeriod - b.expiredInPeriod,
    },
    {
      title: "",
      key: "actions",
      width: 90,
      render: () => (
        <Link href="/wifi/commerce/access-tokens">
          <Button type="link" size="small" onClick={(e) => e.stopPropagation()}>
            Tokens
          </Button>
        </Link>
      ),
    },
  ];

  return (
    <Card size="small" title="Lifecycle by plan" styles={{ body: { padding: 0 } }}>
      <Table<CredentialPlanRow>
        rowKey="planId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{ pageSize: 8, showSizeChanger: rows.length > 8 }}
        scroll={{ x: 560 }}
        onRow={(row) => ({
          onClick: onSelectPlan ? () => onSelectPlan(row.planId) : undefined,
          style: {
            cursor: onSelectPlan ? "pointer" : undefined,
            background: selectedPlanId === row.planId ? "rgba(22, 119, 255, 0.06)" : undefined,
          },
        })}
      />
    </Card>
  );
};

export default TokensPlanTable;
