"use client";

import React from "react";
import { Select, Typography } from "antd";
import type { SubscriptionRecord } from "../types";
const { Text } = Typography;

type Props = {
  subscriptions: SubscriptionRecord[];
  value: string | null;
  loading?: boolean;
  onChange: (orgId: string | null) => void;
};

const OrgPicker: React.FC<Props> = ({ subscriptions, value, loading, onChange }) => (
  <div className="flex flex-col gap-1">
    <Text type="secondary" style={{ fontSize: 12 }}>
      Select tenant subscription
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
      options={subscriptions.map((sub) => ({
        value: sub.orgId,
        label: `${sub.org.code} — ${sub.org.name}`,
        sub,
      }))}
      optionRender={(option) => {
        const sub = (option.data as { sub: SubscriptionRecord }).sub;
        return (
          <div className="flex items-center justify-between gap-2">
            <span>
              <Text strong>{sub.org.name}</Text>
              <Text type="secondary" className="ml-2" code style={{ fontSize: 11 }}>
                {sub.org.code}
              </Text>
            </span>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {sub.activeStationCount}/{sub.stationLimit}
            </Text>
          </div>
        );
      }}
    />
  </div>
);

export default OrgPicker;
