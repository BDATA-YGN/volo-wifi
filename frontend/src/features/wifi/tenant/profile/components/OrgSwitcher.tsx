"use client";

import React from "react";
import { Card, Select, Tag, Typography } from "antd";
import type { OrgMembershipOption } from "../types";

const { Text } = Typography;

type Props = {
  memberships: OrgMembershipOption[];
  value: string | undefined;
  required?: boolean;
  allowClear?: boolean;
  loading?: boolean;
  onChange: (orgId: string) => void;
  onClear?: () => void;
};

const OrgSwitcher: React.FC<Props> = ({
  memberships,
  value,
  required,
  allowClear,
  loading,
  onChange,
  onClear,
}) => (
  <Card
    size="small"
    styles={{ body: { padding: 16 } }}
    title={
      required
        ? "Select organization"
        : allowClear
          ? "Organization filter"
          : "Working organization"
    }
  >
    <Text type="secondary" className="mb-3 block" style={{ fontSize: 13 }}>
      {required
        ? "Developer mode — choose which tenant organization to work on."
        : allowClear
          ? "Optional filter — leave empty to include activity from every tenant."
          : "Switch the working organization when managing more than one tenant."}
    </Text>
    <Select
      showSearch
      allowClear={allowClear}
      style={{ width: "100%", maxWidth: 420 }}
      placeholder={allowClear ? "All tenants (platform view)" : "Choose organization"}
      loading={loading}
      value={value}
      optionFilterProp="label"
      onChange={(id) => {
        if (id) onChange(id);
        else onClear?.();
      }}
      options={memberships.map((m) => ({
        value: m.id,
        label: `${m.name} (${m.code})`,
      }))}
    />
    {value ? (
      <div className="mt-2">
        {memberships.find((m) => m.id === value)?.isPrimary ? (
          <Tag color="blue">Primary membership</Tag>
        ) : null}
        {!memberships.find((m) => m.id === value)?.isActive ? (
          <Tag color="default">Org inactive</Tag>
        ) : null}
      </div>
    ) : null}
  </Card>
);

export default OrgSwitcher;
