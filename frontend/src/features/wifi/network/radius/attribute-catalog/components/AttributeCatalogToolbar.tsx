"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { VALUE_TYPE_OPTIONS } from "../constant";
import type { RadiusAttrValueType } from "../types";

type Props = {
  search: string;
  valueType: RadiusAttrValueType | null;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onValueTypeChange: (value: RadiusAttrValueType | null) => void;
  onRefresh: () => void;
  onAdd: () => void;
};

const AttributeCatalogToolbar: React.FC<Props> = ({
  search,
  valueType,
  loading,
  onSearchChange,
  onValueTypeChange,
  onRefresh,
  onAdd,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <Space wrap>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search FreeRADIUS name or display name…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: 320 }}
      />
      <Select
        value={valueType ?? ""}
        onChange={(v) => onValueTypeChange((v as RadiusAttrValueType) || null)}
        style={{ minWidth: 140 }}
        options={VALUE_TYPE_OPTIONS}
      />
    </Space>
    <Space>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
        Add attribute
      </Button>
    </Space>
  </div>
);

export default AttributeCatalogToolbar;
