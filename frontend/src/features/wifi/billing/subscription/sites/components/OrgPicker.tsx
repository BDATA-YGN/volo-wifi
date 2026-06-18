"use client";

import React from "react";
import { Select, Tag, Typography } from "antd";
import type { LicensedSitesOrgSummary } from "../types";

const { Text } = Typography;

type Props = {
  orgs: LicensedSitesOrgSummary[];
  value: string | null;
  loading?: boolean;
  onChange: (orgId: string | null) => void;
};

const OrgPicker: React.FC<Props> = ({ orgs, value, loading, onChange }) => (
  <div className="flex flex-col gap-1">
    <Text type="secondary" style={{ fontSize: 12 }}>
      Select tenant
    </Text>
    <Select
      showSearch
      allowClear
      placeholder="Search tenant…"
      loading={loading}
      value={value ?? undefined}
      onChange={(v) => onChange(v ?? null)}
      onClear={() => onChange(null)}
      style={{ width: "100%", maxWidth: 480 }}
      optionFilterProp="label"
      options={orgs.map((row) => ({
        value: row.org.id,
        label: `${row.org.code} — ${row.org.name}`,
        row,
      }))}
      optionRender={(option) => {
        const { org, license } = (option.data as { row: LicensedSitesOrgSummary }).row;
        return (
          <div className="flex items-center justify-between gap-2">
            <span>
              <Text strong>{org.name}</Text>
              <Text type="secondary" className="ml-2" code style={{ fontSize: 11 }}>
                {org.code}
              </Text>
            </span>
            <Tag color={license.isAtLimit ? "error" : license.isNearLimit ? "warning" : "default"}>
              {license.billableCount}/{license.stationLimit}
            </Tag>
          </div>
        );
      }}
    />
  </div>
);

export default OrgPicker;
