"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { PriceBookScope } from "../types";
import { SCOPE_OPTIONS } from "../constant";

type Props = {
  search: string;
  scope: PriceBookScope | null;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onScopeChange: (value: PriceBookScope | null) => void;
  onRefresh: () => void;
  onCreate: () => void;
};

const RetailPricingToolbar: React.FC<Props> = ({
  search,
  scope,
  loading,
  onSearchChange,
  onScopeChange,
  onRefresh,
  onCreate,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <Space wrap>
      <Select
        allowClear
        placeholder="Scope"
        style={{ width: 160 }}
        value={scope ?? undefined}
        onChange={(v) => onScopeChange(v ?? null)}
        options={SCOPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      />
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Book name, reseller, site…"
        style={{ minWidth: 260 }}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </Space>
    <Space wrap>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
        New price book
      </Button>
    </Space>
  </div>
);

export default RetailPricingToolbar;
