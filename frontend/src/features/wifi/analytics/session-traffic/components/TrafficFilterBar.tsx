"use client";

import React from "react";
import { Alert, Select, Space, Typography } from "antd";
import type { PlanOption, SiteOption } from "../types";

const { Text } = Typography;

type Props = {
  stations: SiteOption[];
  plans: PlanOption[];
  stationId?: string;
  planId?: string;
  loading?: boolean;
  onStationChange: (value: string | undefined) => void;
  onPlanChange: (value: string | undefined) => void;
};

const TrafficFilterBar: React.FC<Props> = ({
  stations,
  plans,
  stationId,
  planId,
  loading,
  onStationChange,
  onPlanChange,
}) => (
  <div className="flex flex-col gap-3">
    <Space wrap size="middle">
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Site
        </Text>
        <Select
          allowClear
          showSearch
          placeholder="All sites"
          style={{ minWidth: 220 }}
          loading={loading}
          value={stationId}
          optionFilterProp="label"
          onChange={(v) => onStationChange(v)}
          options={stations.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.code})`,
          }))}
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
          style={{ minWidth: 220 }}
          loading={loading}
          value={planId}
          optionFilterProp="label"
          onChange={(v) => onPlanChange(v)}
          options={plans.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.code})`,
          }))}
        />
      </div>
    </Space>
    {stationId || planId ? (
      <Alert
        type="info"
        showIcon
        message={
          <Text style={{ fontSize: 13 }}>
            {stationId
              ? `Filtered to site ${stations.find((s) => s.id === stationId)?.name ?? stationId}`
              : null}
            {stationId && planId ? " · " : null}
            {planId
              ? `Plan ${plans.find((p) => p.id === planId)?.name ?? planId}`
              : null}
          </Text>
        }
      />
    ) : null}
  </div>
);

export default TrafficFilterBar;
