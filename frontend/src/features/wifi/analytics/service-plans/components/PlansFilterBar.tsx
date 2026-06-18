"use client";

import React from "react";
import { Card, Select, Space, Typography } from "antd";
import { QUOTA_TYPE_OPTIONS } from "@/features/wifi/catalog/service-plans/constant";
import type { PlanOption } from "../types";
import type { PlanQuotaType } from "@/features/wifi/catalog/service-plans/types";

const { Text } = Typography;

type Props = {
  plans: PlanOption[];
  planId?: string;
  quotaType?: PlanQuotaType;
  loading?: boolean;
  onPlanChange: (id: string | undefined) => void;
  onQuotaTypeChange: (value: PlanQuotaType | undefined) => void;
};

const PlansFilterBar: React.FC<Props> = ({
  plans,
  planId,
  quotaType,
  loading,
  onPlanChange,
  onQuotaTypeChange,
}) => (
  <Card size="small" styles={{ body: { padding: 16 } }} title="Filters">
    <Text type="secondary" className="mb-3 block" style={{ fontSize: 13 }}>
      Narrow by quota type or a specific service plan. Click a table row to drill down.
    </Text>
    <Space wrap size="middle">
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Quota type
        </Text>
        <Select
          allowClear
          placeholder="All types"
          style={{ minWidth: 180 }}
          loading={loading}
          value={quotaType}
          onChange={(v) => onQuotaTypeChange(v ?? undefined)}
          options={QUOTA_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Service plan
        </Text>
        <Select
          allowClear
          showSearch
          placeholder="All plans"
          style={{ minWidth: 280 }}
          loading={loading}
          value={planId}
          optionFilterProp="label"
          onChange={(v) => onPlanChange(v ?? undefined)}
          options={plans
            .filter((p) => !quotaType || p.quotaType === quotaType)
            .map((p) => ({
              value: p.id,
              label: `${p.name} (${p.code})`,
            }))}
        />
      </div>
    </Space>
  </Card>
);

export default PlansFilterBar;
