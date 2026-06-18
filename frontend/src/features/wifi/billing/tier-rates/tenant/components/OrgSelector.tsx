"use client";

import React from "react";
import { Select, Tag, Typography } from "antd";
import type { OrgSummary } from "../types";

const { Text } = Typography;

type Props = {
  orgs: OrgSummary[];
  value: string | null;
  loading?: boolean;
  onChange: (orgId: string) => void;
};

const OrgSelector: React.FC<Props> = ({ orgs, value, loading, onChange }) => (
  <div className="flex flex-col gap-1">
    <Text type="secondary" style={{ fontSize: 12 }}>
      Select tenant organization
    </Text>
    <Select
      showSearch
      allowClear
      placeholder="Search by name or code…"
      loading={loading}
      value={value ?? undefined}
      onChange={(v) => onChange(v)}
      onClear={() => onChange("")}
      style={{ width: "100%", maxWidth: 480 }}
      optionFilterProp="label"
      options={orgs.map((org) => ({
        value: org.id,
        label: `${org.code} — ${org.name}`,
        org,
      }))}
      optionRender={(option) => {
        const org = (option.data as { org: OrgSummary }).org;
        return (
          <div className="flex items-center justify-between gap-2 py-0.5">
            <div>
              <Text strong>{org.name}</Text>
              <div>
                <Text type="secondary" code style={{ fontSize: 11 }}>
                  {org.code}
                </Text>
              </div>
            </div>
            {org.overrideCount ? (
              <Tag color="blue">{org.overrideCount} override(s)</Tag>
            ) : (
              <Tag>Platform default</Tag>
            )}
          </div>
        );
      }}
    />
  </div>
);

export default OrgSelector;
