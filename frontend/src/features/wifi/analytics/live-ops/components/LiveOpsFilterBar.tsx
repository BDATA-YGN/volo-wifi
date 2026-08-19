"use client";

import React from "react";
import { Select, Space, Typography } from "antd";
import type { PlanOption, ProfileOption, SiteOption, StationSizeOption } from "../types";

const { Text } = Typography;

type Props = {
  stations: SiteOption[];
  stationSizes: StationSizeOption[];
  profiles: ProfileOption[];
  plans: PlanOption[];
  stationId?: string;
  stationSizeId?: string;
  profile?: string;
  planId?: string;
  loading?: boolean;
  onStationChange: (id: string | undefined) => void;
  onStationSizeChange: (id: string | undefined) => void;
  onProfileChange: (value: string | undefined) => void;
  onPlanChange: (id: string | undefined) => void;
};

const LiveOpsFilterBar: React.FC<Props> = ({
  stations,
  stationSizes,
  profiles,
  plans,
  stationId,
  stationSizeId,
  profile,
  planId,
  loading,
  onStationChange,
  onStationSizeChange,
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
        options={stations
          .filter((s) => !stationSizeId || s.stationSizeId === stationSizeId)
          .map((s) => ({
            value: s.id,
            label: `${s.name} (${s.code})`,
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
        style={{ minWidth: 160 }}
        loading={loading}
        value={profile}
        onChange={(v) => onProfileChange(v ?? undefined)}
        options={
          profiles.length > 0
            ? profiles
            : [
                { value: "MikroTik", label: "MikroTik" },
                { value: "Ruijie", label: "Ruijie" },
              ]
        }
      />
    </div>
    <div>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
        Tier
      </Text>
      <Select
        allowClear
        showSearch
        placeholder="All tiers"
        style={{ minWidth: 160 }}
        loading={loading}
        value={stationSizeId}
        optionFilterProp="label"
        onChange={(v) => onStationSizeChange(v ?? undefined)}
        options={stationSizes.map((t) => ({
          value: t.id,
          label: `${t.name} (${t.code})`,
        }))}
      />
    </div>
    <div>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
        Plan
      </Text>
      <Select
        allowClear
        showSearch
        placeholder="All plans"
        style={{ minWidth: 220 }}
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
  </Space>
);

export default LiveOpsFilterBar;
