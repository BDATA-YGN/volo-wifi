"use client";

import React from "react";
import { Badge, Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { QUOTA_TYPE_COLOR } from "@/features/wifi/catalog/service-plans/constant";
import { formatQuotaTypeLabel } from "@/features/wifi/catalog/service-plans/utils";
import type { PlanQuotaType } from "@/features/wifi/catalog/service-plans/types";
import type { PlanRow } from "../types";
import { formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: PlanRow[];
  currency: string;
  loading?: boolean;
  onSelectPlan?: (planId: string) => void;
  selectedPlanId?: string | null;
};

const PlansTable: React.FC<Props> = ({
  rows,
  currency,
  loading,
  onSelectPlan,
  selectedPlanId,
}) => {
  const columns: ColumnsType<PlanRow> = [
    {
      title: "Plan",
      key: "plan",
      fixed: "left",
      width: 220,
      render: (_, row) => (
        <div>
          <Text strong>{row.name}</Text>
          <div className="mt-1 flex flex-wrap gap-1">
            <Tag style={{ fontFamily: "monospace" }}>{row.code}</Tag>
            <Badge status={row.isActive ? "success" : "default"} text={row.isActive ? "Active" : "Inactive"} />
          </div>
        </div>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: "Quota",
      key: "quotaType",
      width: 120,
      render: (_, row) => (
        <Tag color={QUOTA_TYPE_COLOR[row.quotaType as PlanQuotaType] ?? "default"}>
          {formatQuotaTypeLabel(row.quotaType as PlanQuotaType)}
        </Tag>
      ),
    },
    {
      title: "Orders",
      dataIndex: "ordersCount",
      key: "ordersCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.ordersCount - b.ordersCount,
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
    {
      title: "Commission",
      key: "commission",
      width: 110,
      align: "right",
      render: (_, row) => formatMoney(row.commission, currency),
      sorter: (a, b) => a.commission - b.commission,
    },
  ];

  return (
    <Card size="small" title="Plan uptake ranking" styles={{ body: { padding: 0 } }}>
      <Table<PlanRow>
        rowKey="planId"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={{
          pageSize: 10,
          showSizeChanger: rows.length > 10,
          showTotal: (total) => `${total} plan${total === 1 ? "" : "s"}`,
        }}
        scroll={{ x: 720 }}
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

export default PlansTable;
