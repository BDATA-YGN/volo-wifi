"use client";

import React from "react";
import { Button, Input, Segmented, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";

export type TierStatusFilter = "all" | "active" | "inactive";

type Props = {
  search: string;
  statusFilter: TierStatusFilter;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: TierStatusFilter) => void;
  onRefresh: () => void;
  onCreate: () => void;
};

const CapacityTiersToolbar: React.FC<Props> = ({
  search,
  statusFilter,
  loading,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onCreate,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Space wrap>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search code or name…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: 260 }}
      />
      <Segmented<TierStatusFilter>
        value={statusFilter}
        onChange={onStatusChange}
        options={[
          { label: "All", value: "all" },
          { label: "Active", value: "active" },
          { label: "Inactive", value: "inactive" },
        ]}
      />
    </Space>
    <Space>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
        Add tier
      </Button>
    </Space>
  </div>
);

export default CapacityTiersToolbar;
