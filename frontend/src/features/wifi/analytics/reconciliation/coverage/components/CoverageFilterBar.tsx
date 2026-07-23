"use client";

import React from "react";
import { Alert, Select, Space, Typography } from "antd";
import { ELIGIBILITY_OPTIONS } from "../constant";
import type { EligibilityStatus, PartnerOption, SiteOption } from "../types";
import { formatEligibility } from "../utils";

const { Text } = Typography;

type Props = {
  stations: SiteOption[];
  resellers: PartnerOption[];
  stationId?: string;
  resellerId?: string;
  eligibility?: EligibilityStatus;
  loading?: boolean;
  onStationChange: (value: string | undefined) => void;
  onResellerChange: (value: string | undefined) => void;
  onEligibilityChange: (value: EligibilityStatus | undefined) => void;
};

const CoverageFilterBar: React.FC<Props> = ({
  stations,
  resellers,
  stationId,
  resellerId,
  eligibility,
  loading,
  onStationChange,
  onResellerChange,
  onEligibilityChange,
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
          Eligibility
        </Text>
        <Select
          allowClear
          placeholder="All statuses"
          style={{ minWidth: 200 }}
          loading={loading}
          value={eligibility}
          onChange={(v) => onEligibilityChange(v)}
          options={ELIGIBILITY_OPTIONS}
        />
      </div>
    </Space>
    {stationId || resellerId || eligibility ? (
      <Alert
        type="info"
        showIcon
        title={
          <Text style={{ fontSize: 13 }}>
            {stationId
              ? `Site ${stations.find((s) => s.id === stationId)?.name ?? stationId}`
              : null}
            {stationId && (resellerId || eligibility) ? " · " : null}
            {resellerId
              ? `Partner ${resellers.find((r) => r.id === resellerId)?.name ?? resellerId}`
              : null}
            {resellerId && eligibility ? " · " : null}
            {eligibility ? formatEligibility(eligibility) : null}
          </Text>
        }
      />
    ) : null}
  </div>
);

export default CoverageFilterBar;
