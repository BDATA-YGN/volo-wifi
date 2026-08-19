"use client";

import React from "react";
import { Select, Space } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ELIGIBILITY_OPTIONS } from "../constant";
import type { EligibilityStatus, PartnerOption, SiteOption } from "../types";

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
  <Space wrap size="middle" align="end">
    <div>
      <WifiMutedText style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
        Site
      </WifiMutedText>
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
      <WifiMutedText style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
        Partner
      </WifiMutedText>
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
      <WifiMutedText style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
        Eligibility
      </WifiMutedText>
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
);

export default CoverageFilterBar;
