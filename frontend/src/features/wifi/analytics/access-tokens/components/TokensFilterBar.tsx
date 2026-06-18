"use client";

import React from "react";
import { Card, Select, Space, Typography } from "antd";
import type { CredentialType } from "../types";
import type { PlanOption } from "../types";
import { formatCredentialType } from "../utils";

const { Text } = Typography;

const TYPE_OPTIONS: { value: CredentialType; label: string }[] = [
  { value: "VOUCHER_TOKEN", label: "Voucher token" },
  { value: "USER_PASSWORD", label: "Username & password" },
];

type Props = {
  plans: PlanOption[];
  planId?: string;
  credentialType?: CredentialType;
  loading?: boolean;
  onPlanChange: (id: string | undefined) => void;
  onTypeChange: (value: CredentialType | undefined) => void;
};

const TokensFilterBar: React.FC<Props> = ({
  plans,
  planId,
  credentialType,
  loading,
  onPlanChange,
  onTypeChange,
}) => (
  <Card size="small" styles={{ body: { padding: 16 } }} title="Filters">
    <Text type="secondary" className="mb-3 block" style={{ fontSize: 13 }}>
      Narrow lifecycle analytics by credential type or service plan.
    </Text>
    <Space wrap size="middle">
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Credential type
        </Text>
        <Select
          allowClear
          placeholder="All types"
          style={{ minWidth: 200 }}
          loading={loading}
          value={credentialType}
          onChange={(v) => onTypeChange(v ?? undefined)}
          options={TYPE_OPTIONS}
        />
      </div>
      <div>
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Service plan
        </Text>
        <Select
          allowClear
          showSearch
          placeholder="All plans"
          style={{ minWidth: 280 }}
          loading={loading}
          value={planId}
          optionFilterProp="label"
          onChange={(v) => onPlanChange(v ?? undefined)}
          options={plans.map((p) => ({
            value: p.id,
            label: `${p.name} (${p.code})`,
          }))}
        />
      </div>
    </Space>
    {credentialType ? (
      <Text type="secondary" style={{ fontSize: 12, marginTop: 8, display: "block" }}>
        Showing {formatCredentialType(credentialType)} credentials only.
      </Text>
    ) : null}
  </Card>
);

export default TokensFilterBar;
