"use client";

import React from "react";
import { Alert, Select, Space, Typography } from "antd";
import { STATUS_OPTIONS } from "../constant";
import type { SiteOption, StationSizeOption, StationStatus } from "../types";
import { formatStatusLabel } from "../utils";

const { Text } = Typography;

type Props = {
  stationSizes: StationSizeOption[];
  stations: SiteOption[];
  stationSizeId?: string;
  stationId?: string;
  status?: StationStatus;
  loading?: boolean;
  onStationSizeChange: (value: string | undefined) => void;
  onStationChange: (value: string | undefined) => void;
  onStatusChange: (value: StationStatus | undefined) => void;
};

const InventoryFilterBar: React.FC<Props> = ({
  stationSizes,
  stations,
  stationSizeId,
  stationId,
  status,
  loading,
  onStationSizeChange,
  onStationChange,
  onStatusChange,
}) => (
  <div className="flex flex-col gap-3">
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
          onChange={(v) => onStationSizeChange(v)}
          options={stationSizes.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.code})`,
          }))}
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Site status
        </Text>
        <Select
          allowClear
          placeholder="All statuses"
          style={{ minWidth: 160 }}
          loading={loading}
          value={status}
          onChange={(v) => onStatusChange(v)}
          options={STATUS_OPTIONS}
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
    </Space>
    {stationSizeId || stationId || status ? (
      <Alert
        type="info"
        showIcon
        title={
          <Text style={{ fontSize: 13 }}>
            {stationSizeId
              ? `Tier ${stationSizes.find((t) => t.id === stationSizeId)?.name ?? stationSizeId}`
              : null}
            {stationSizeId && (status || stationId) ? " · " : null}
            {status ? formatStatusLabel(status) : null}
            {status && stationId ? " · " : null}
            {stationId
              ? `Site ${stations.find((s) => s.id === stationId)?.name ?? stationId}`
              : null}
          </Text>
        }
      />
    ) : null}
  </div>
);

export default InventoryFilterBar;
