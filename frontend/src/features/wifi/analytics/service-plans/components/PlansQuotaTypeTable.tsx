"use client";

import React from "react";
import { Card, Table, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { QUOTA_TYPE_COLOR } from "@/features/wifi/catalog/service-plans/constant";
import { formatQuotaTypeLabel } from "@/features/wifi/catalog/service-plans/utils";
import type { PlanQuotaType } from "@/features/wifi/catalog/service-plans/types";
import type { PlanQuotaTypeRow } from "../types";
import { formatBytes, formatMoney } from "../utils";

const { Text } = Typography;

type Props = {
  rows: PlanQuotaTypeRow[];
  currency: string;
  loading?: boolean;
  onSelectQuotaType?: (quotaType: PlanQuotaType) => void;
  selectedQuotaType?: string | null;
};

const PlansQuotaTypeTable: React.FC<Props> = ({
  rows,
  currency,
  loading,
  onSelectQuotaType,
  selectedQuotaType,
}) => {
  const columns: ColumnsType<PlanQuotaTypeRow> = [
    {
      title: "Quota type",
      key: "quotaType",
      render: (_, row) => (
        <Tag color={QUOTA_TYPE_COLOR[row.quotaType as PlanQuotaType] ?? "default"}>
          {formatQuotaTypeLabel(row.quotaType as PlanQuotaType)}
        </Tag>
      ),
    },
    {
      title: "Plans",
      key: "plans",
      width: 100,
      align: "right",
      render: (_, row) => (
        <span>
          {row.activePlanCount}
          <Text type="secondary"> / {row.planCount}</Text>
        </span>
      ),
      sorter: (a, b) => a.planCount - b.planCount,
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
      title: "Sessions",
      dataIndex: "sessionsCount",
      key: "sessionsCount",
      width: 90,
      align: "right",
      sorter: (a, b) => a.sessionsCount - b.sessionsCount,
    },
  ];

  return (
    <Card size="small" title="Uptake by quota type" styles={{ body: { padding: 0 } }}>
      <Table<PlanQuotaTypeRow>
        rowKey="quotaType"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={rows}
        pagination={false}
        scroll={{ x: 480 }}
        onRow={(row) => ({
          onClick: onSelectQuotaType
            ? () => onSelectQuotaType(row.quotaType as PlanQuotaType)
            : undefined,
          style: {
            cursor: onSelectQuotaType ? "pointer" : undefined,
            background:
              selectedQuotaType === row.quotaType ? "rgba(22, 119, 255, 0.06)" : undefined,
          },
        })}
      />
    </Card>
  );
};

export default PlansQuotaTypeTable;
