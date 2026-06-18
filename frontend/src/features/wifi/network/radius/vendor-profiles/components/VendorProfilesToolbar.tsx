"use client";

import React from "react";
import { Button, Input, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";

type Props = {
  search: string;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
};

const VendorProfilesToolbar: React.FC<Props> = ({
  search,
  loading,
  onSearchChange,
  onRefresh,
  onAdd,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder="Search profile, vendor, model…"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      style={{ width: 300 }}
    />
    <Space>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
        New profile
      </Button>
    </Space>
  </div>
);

export default VendorProfilesToolbar;
