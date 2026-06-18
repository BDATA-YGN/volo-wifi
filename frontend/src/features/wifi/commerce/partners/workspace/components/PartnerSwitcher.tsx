"use client";

import React from "react";
import { Card, Select, Tag, Typography } from "antd";
import type { ResellerPickerOption } from "../types";
import { STATUS_COLOR } from "../constant";
import { formatStatusLabel } from "../utils";

const { Text } = Typography;

type Props = {
  resellers: ResellerPickerOption[];
  value: string | undefined;
  required?: boolean;
  loading?: boolean;
  onChange: (resellerId: string) => void;
};

const PartnerSwitcher: React.FC<Props> = ({
  resellers,
  value,
  required,
  loading,
  onChange,
}) => (
  <Card
    size="small"
    styles={{ body: { padding: 16 } }}
    title={required ? "Select partner" : "Partner context"}
  >
    <Text type="secondary" className="mb-3 block" style={{ fontSize: 13 }}>
      {required
        ? "Choose a partner to preview their workspace home."
        : "Switch between partners when managing multiple reseller accounts."}
    </Text>
    <Select
      showSearch
      style={{ width: "100%", maxWidth: 420 }}
      placeholder="Choose partner"
      loading={loading}
      value={value}
      optionFilterProp="label"
      onChange={onChange}
      options={resellers.map((r) => ({
        value: r.id,
        label: `${r.name} (${r.code})`,
      }))}
    />
    {value ? (
      <div className="mt-2">
        {(() => {
          const row = resellers.find((r) => r.id === value);
          return row ? (
            <Tag color={STATUS_COLOR[row.status]}>{formatStatusLabel(row.status)}</Tag>
          ) : null;
        })()}
      </div>
    ) : null}
  </Card>
);

export default PartnerSwitcher;
