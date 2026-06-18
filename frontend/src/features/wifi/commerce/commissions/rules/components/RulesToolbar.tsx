"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { CommissionType, RulesFormOptions } from "../types";
import { TYPE_OPTIONS } from "../constant";

type Props = {
  search: string;
  type: CommissionType | null;
  resellerId: string | null;
  planId: string | null;
  isActive: boolean | null;
  formOptions: RulesFormOptions;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onTypeChange: (type: CommissionType | null) => void;
  onResellerChange: (id: string | null) => void;
  onPlanChange: (id: string | null) => void;
  onActiveChange: (active: boolean | null) => void;
  onRefresh: () => void;
  onCreate: () => void;
};

const RulesToolbar: React.FC<Props> = ({
  search,
  type,
  resellerId,
  planId,
  isActive,
  formOptions,
  loading,
  onSearchChange,
  onTypeChange,
  onResellerChange,
  onPlanChange,
  onActiveChange,
  onRefresh,
  onCreate,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Space wrap>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search partner, plan…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: 240 }}
      />
      <Select
        allowClear
        placeholder="Type"
        value={type}
        onChange={onTypeChange}
        style={{ width: 130 }}
        options={TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label.split(" ")[0] }))}
      />
      <Select
        allowClear
        showSearch
        placeholder="Partner"
        value={resellerId}
        onChange={onResellerChange}
        optionFilterProp="label"
        style={{ width: 180 }}
        options={formOptions.resellers.map((r) => ({
          value: r.id,
          label: `${r.code} — ${r.name}`,
        }))}
      />
      <Select
        allowClear
        showSearch
        placeholder="Plan"
        value={planId}
        onChange={onPlanChange}
        optionFilterProp="label"
        style={{ width: 180 }}
        options={formOptions.plans.map((p) => ({
          value: p.id,
          label: `${p.code} — ${p.name}`,
        }))}
      />
      <Select
        allowClear
        placeholder="Status"
        value={isActive}
        onChange={onActiveChange}
        style={{ width: 110 }}
        options={[
          { value: true, label: "Active" },
          { value: false, label: "Inactive" },
        ]}
      />
    </Space>
    <Space>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
        New rule
      </Button>
    </Space>
  </div>
);

export default RulesToolbar;
