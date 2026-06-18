"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { MemberStatus } from "../types";

type Props = {
  search: string;
  status: MemberStatus | null;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: MemberStatus | null) => void;
  onRefresh: () => void;
  onAdd: () => void;
};

const AccessControlToolbar: React.FC<Props> = ({
  search,
  status,
  loading,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onAdd,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <Space wrap>
      <Select
        allowClear
        placeholder="Status"
        style={{ width: 140 }}
        value={status ?? undefined}
        onChange={(v) => onStatusChange(v ?? null)}
        options={[
          { value: "ACTIVE", label: "Active" },
          { value: "SUSPENDED", label: "Suspended" },
          { value: "DISABLED", label: "Disabled" },
        ]}
      />
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Name, username, email…"
        style={{ minWidth: 240 }}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </Space>
    <Space wrap>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
        Add member
      </Button>
    </Space>
  </div>
);

export default AccessControlToolbar;
