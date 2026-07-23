"use client";

import React from "react";
import { Button, Input, Space } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";

type Props = {
  search: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onAdd: () => void;
  loading?: boolean;
  disabled?: boolean;
};

const RadiusProfilesToolbar: React.FC<Props> = ({
  search,
  onSearchChange,
  onRefresh,
  onAdd,
  loading,
  disabled,
}) => (
  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
    <Input.Search
      allowClear
      placeholder="Search name, server, site…"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      style={{ maxWidth: 320 }}
      disabled={disabled}
    />
    <Space>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading} disabled={disabled}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onAdd} disabled={disabled}>
        Add server
      </Button>
    </Space>
  </div>
);

export default RadiusProfilesToolbar;
