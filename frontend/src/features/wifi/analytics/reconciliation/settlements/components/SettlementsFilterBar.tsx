"use client";

import React from "react";
import { Alert, Select, Space, Typography } from "antd";
import { STATUS_OPTIONS } from "../constant";
import type { PartnerOption, SettlementStatus, SiteOption } from "../types";
import { formatStatusLabel } from "../utils";

const { Text } = Typography;

type Props = {
  stations: SiteOption[];
  resellers: PartnerOption[];
  stationId?: string;
  resellerId?: string;
  status?: SettlementStatus;
  loading?: boolean;
  onStationChange: (value: string | undefined) => void;
  onResellerChange: (value: string | undefined) => void;
  onStatusChange: (value: SettlementStatus | undefined) => void;
};

const SettlementsFilterBar: React.FC<Props> = ({
  stations,
  resellers,
  stationId,
  resellerId,
  status,
  loading,
  onStationChange,
  onResellerChange,
  onStatusChange,
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
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Status
        </Text>
        <Select
          allowClear
          placeholder="All statuses"
          style={{ minWidth: 180 }}
          loading={loading}
          value={status}
          onChange={(v) => onStatusChange(v)}
          options={STATUS_OPTIONS}
        />
      </div>
    </Space>
    {stationId || resellerId || status ? (
      <Alert
        type="info"
        showIcon
        title={
          <Text style={{ fontSize: 13 }}>
            {stationId
              ? `Site ${stations.find((s) => s.id === stationId)?.name ?? stationId}`
              : null}
            {stationId && (resellerId || status) ? " · " : null}
            {resellerId
              ? `Partner ${resellers.find((r) => r.id === resellerId)?.name ?? resellerId}`
              : null}
            {resellerId && status ? " · " : null}
            {status ? formatStatusLabel(status) : null}
          </Text>
        }
      />
    ) : null}
  </div>
);

export default SettlementsFilterBar;
