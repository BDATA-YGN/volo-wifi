"use client";

import React from "react";
import { Alert, Select, Space, Typography } from "antd";
import type { PartnerOption, SiteOption } from "../types";

const { Text } = Typography;

type Props = {
  stations: SiteOption[];
  resellers: PartnerOption[];
  stationId?: string;
  resellerId?: string;
  loading?: boolean;
  onStationChange: (value: string | undefined) => void;
  onResellerChange: (value: string | undefined) => void;
};

const LiveOpsFilterBar: React.FC<Props> = ({
  stations,
  resellers,
  stationId,
  resellerId,
  loading,
  onStationChange,
  onResellerChange,
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
          style={{ minWidth: 200 }}
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
          onChange={(v) => onResellerChange(v)}
          options={resellers.map((r) => ({
            value: r.id,
            label: `${r.name} (${r.code})`,
          }))}
        />
      </div>
    </Space>
    {stationId || resellerId ? (
      <Alert
        type="info"
        showIcon
        title={
          <Text style={{ fontSize: 13 }}>
            {stationId
              ? `Site ${stations.find((s) => s.id === stationId)?.name ?? stationId}`
              : null}
            {stationId && resellerId ? " · " : null}
            {resellerId
              ? `Partner ${resellers.find((r) => r.id === resellerId)?.name ?? resellerId}`
              : null}
          </Text>
        }
      />
    ) : null}
  </div>
);

export default LiveOpsFilterBar;
