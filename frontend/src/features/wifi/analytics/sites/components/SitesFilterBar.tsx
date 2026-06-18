"use client";

import React from "react";
import { Card, Select, Space, Typography } from "antd";
import type { SiteOption, StationSizeOption } from "../types";

const { Text } = Typography;

type Props = {
  stations: SiteOption[];
  stationSizes: StationSizeOption[];
  stationId?: string;
  stationSizeId?: string;
  loading?: boolean;
  onStationChange: (id: string | undefined) => void;
  onStationSizeChange: (id: string | undefined) => void;
};

const SitesFilterBar: React.FC<Props> = ({
  stations,
  stationSizes,
  stationId,
  stationSizeId,
  loading,
  onStationChange,
  onStationSizeChange,
}) => (
  <Card size="small" styles={{ body: { padding: 16 } }} title="Filters">
    <Text type="secondary" className="mb-3 block" style={{ fontSize: 13 }}>
      Narrow analytics by capacity tier or a specific site. Click a site row to drill down.
    </Text>
    <Space wrap size="middle">
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Capacity tier
        </Text>
        <Select
          allowClear
          showSearch
          placeholder="All tiers"
          style={{ minWidth: 200 }}
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
          Site
        </Text>
        <Select
          allowClear
          showSearch
          placeholder="All sites"
          style={{ minWidth: 260 }}
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
    </Space>
  </Card>
);

export default SitesFilterBar;
