"use client";

import React from "react";
import { Card, Select, Typography } from "antd";
import type { PartnerOption } from "../types";

const { Text } = Typography;

type Props = {
  resellers: PartnerOption[];
  resellerId?: string;
  loading?: boolean;
  onResellerChange: (id: string | undefined) => void;
};

const PartnersFilterBar: React.FC<Props> = ({
  resellers,
  resellerId,
  loading,
  onResellerChange,
}) => (
  <Card size="small" styles={{ body: { padding: 16 } }} title="Filters">
    <Text type="secondary" className="mb-3 block" style={{ fontSize: 13 }}>
      Focus on a single partner or view rankings across all resellers. Click a table row to drill
      down.
    </Text>
    <div>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
        Partner
      </Text>
      <Select
        allowClear
        showSearch
        placeholder="All partners"
        style={{ minWidth: 280, maxWidth: 420 }}
        loading={loading}
        value={resellerId}
        optionFilterProp="label"
        onChange={(v) => onResellerChange(v ?? undefined)}
        options={resellers.map((r) => ({
          value: r.id,
          label: `${r.name} (${r.code})`,
        }))}
      />
    </div>
  </Card>
);

export default PartnersFilterBar;
