"use client";

import React from "react";
import { Select, Space, Typography } from "antd";
import type { PartnerOption, PlanOption, ProfileOption, SiteOption } from "../types";

const { Text } = Typography;

type Props = {
  stations: SiteOption[];
  resellers: PartnerOption[];
  profiles: ProfileOption[];
  plans: PlanOption[];
  stationId?: string;
  resellerId?: string;
  profile?: string;
  planId?: string;
  loading?: boolean;
  onStationChange: (id: string | undefined) => void;
  onResellerChange: (id: string | undefined) => void;
  onProfileChange: (value: string | undefined) => void;
  onPlanChange: (id: string | undefined) => void;
};

const PlansFilterBar: React.FC<Props> = ({
  stations,
  resellers,
  profiles,
  plans,
  stationId,
  resellerId,
  profile,
  planId,
  loading,
  onStationChange,
  onResellerChange,
  onProfileChange,
  onPlanChange,
}) => (
  <Space wrap size="middle" align="end">
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Site
        </Text>
        <Select
          allowClear
          showSearch
          placeholder="All sites"
          style={{ minWidth: 200 }}
          loading={loading}
          value={stationId}
          optionFilterProp="label"
          onChange={(v) => onStationChange(v ?? undefined)}
          options={stations.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.code})`,
          }))}
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Partner
        </Text>
        <Select
          allowClear
          showSearch
          placeholder="All partners"
          style={{ minWidth: 200 }}
          loading={loading}
          value={resellerId}
          optionFilterProp="label"
          onChange={(v) => onResellerChange(v ?? undefined)}
          options={resellers.map((r) => ({
            value: r.id,
            label: `${r.name} (${r.code})`,
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
          style={{ minWidth: 240 }}
          loading={loading}
          value={planId}
          optionFilterProp="label"
          onChange={(v) => onPlanChange(v ?? undefined)}
          options={plans.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.code})`,
          }))}
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Profile
        </Text>
        <Select
          allowClear
          placeholder="All profiles"
          style={{ minWidth: 180 }}
          loading={loading}
          value={profile}
          onChange={(v) => onProfileChange(v ?? undefined)}
          options={profiles}
        />
      </div>
    </Space>
);

export default PlansFilterBar;
