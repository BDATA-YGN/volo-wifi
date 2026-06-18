"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import {
  PlusOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

export type AdminStatusFilter = "all" | "active" | "inactive";

interface AdminUsersToolbarProps {
  loading?: boolean;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch: (value: string) => void;
  roles: Array<{ roleId: number; roleName: string }>;
  rolesLoading?: boolean;
  roleFilter: number | undefined;
  onRoleChange: (roleId: number | undefined) => void;
  statusFilter: AdminStatusFilter;
  onStatusChange: (status: AdminStatusFilter) => void;
  onRefresh: () => void;
  onAdd: () => void;
}

const AdminUsersToolbar: React.FC<AdminUsersToolbarProps> = ({
  loading,
  searchPlaceholder = "Search",
  searchValue,
  onSearch,
  roles,
  rolesLoading,
  roleFilter,
  onRoleChange,
  statusFilter,
  onStatusChange,
  onRefresh,
  onAdd,
}) => {
  return (
    <Space wrap size={[8, 8]}>
      <Input.Search
        allowClear
        placeholder={searchPlaceholder}
        defaultValue={searchValue}
        onSearch={(value) => onSearch(value || "")}
        style={{ width: 220, maxWidth: "100%" }}
      />
      <Select
        allowClear
        placeholder="All roles"
        loading={!!rolesLoading}
        value={roleFilter}
        onChange={(value) => onRoleChange(value as number | undefined)}
        options={roles.map((role) => ({
          value: role.roleId,
          label: role.roleName,
        }))}
        style={{ minWidth: 160 }}
      />
      <Select
        value={statusFilter}
        onChange={(value) => onStatusChange(value as AdminStatusFilter)}
        options={[
          { value: "all", label: "All status" },
          { value: "active", label: "Active only" },
          { value: "inactive", label: "Inactive only" },
        ]}
        style={{ minWidth: 140 }}
      />
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={!!loading}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
        Add administrator
      </Button>
    </Space>
  );
};

export default AdminUsersToolbar;
