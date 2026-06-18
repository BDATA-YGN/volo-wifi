"use client";

import React from "react";
import { Select, Tag, Typography } from "antd";
import type { ChangelogOrgSummary } from "../types";
import { formatDateTime } from "../../../tier-rates/platform/utils";

const { Text } = Typography;

type Props = {
  orgs: ChangelogOrgSummary[];
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
        const { org, historyCount, lastChangeAt } = (option.data as { row: ChangelogOrgSummary })
          .row;
        return (
          <div className="flex items-center justify-between gap-2">
            <span>
              <Text strong>{org.name}</Text>
              <Text type="secondary" className="ml-2" code style={{ fontSize: 11 }}>
                {org.code}
              </Text>
            </span>
            <Tag>{historyCount} entries</Tag>
            {lastChangeAt ? (
              <Text type="secondary" style={{ fontSize: 11 }}>
                {formatDateTime(lastChangeAt)}
              </Text>
            ) : null}
          </div>
        );
      }}
    />
  </div>
);

export default OrgPicker;
