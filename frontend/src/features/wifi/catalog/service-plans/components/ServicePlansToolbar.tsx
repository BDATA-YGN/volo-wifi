"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { PlanQuotaType } from "../types";
import { QUOTA_TYPE_OPTIONS } from "../constant";

type Props = {
  search: string;
  quotaType: PlanQuotaType | null;
  isActive: "true" | "false" | null;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onQuotaTypeChange: (value: PlanQuotaType | null) => void;
  onActiveChange: (value: "true" | "false" | null) => void;
  onRefresh: () => void;
  onCreate: () => void;
};

const ServicePlansToolbar: React.FC<Props> = ({
  search,
  quotaType,
  isActive,
  loading,
  onSearchChange,
  onQuotaTypeChange,
  onActiveChange,
  onRefresh,
  onCreate,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <Space wrap>
      <Select
        allowClear
        placeholder="Plan type"
        style={{ width: 150 }}
        value={quotaType ?? undefined}
        onChange={(v) => onQuotaTypeChange(v ?? null)}
        options={QUOTA_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      />
      <Select
        allowClear
        placeholder="Status"
        style={{ width: 120 }}
        value={isActive ?? undefined}
        onChange={(v) => onActiveChange(v ?? null)}
        options={[
          { value: "true", label: "Active" },
          { value: "false", label: "Inactive" },
        ]}
      />
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Code, name, description…"
        style={{ minWidth: 240 }}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </Space>
    <Space wrap>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
        New plan
      </Button>
    </Space>
  </div>
);

export default ServicePlansToolbar;
