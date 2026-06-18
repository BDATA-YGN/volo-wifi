"use client";

import React from "react";
import Link from "next/link";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { OrgLicenseStatus } from "../types";
import { LICENSE_STATUS_OPTIONS } from "../constant";

type Props = {
  search: string;
  isActive: "true" | "false" | null;
  licenseStatus: OrgLicenseStatus | null;
  hasLicense: "true" | "false" | null;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onIsActiveChange: (value: "true" | "false" | null) => void;
  onLicenseStatusChange: (value: OrgLicenseStatus | null) => void;
  onHasLicenseChange: (value: "true" | "false" | null) => void;
  onRefresh: () => void;
};

const TenantsToolbar: React.FC<Props> = ({
  search,
  isActive,
  licenseStatus,
  hasLicense,
  loading,
  onSearchChange,
  onIsActiveChange,
  onLicenseStatusChange,
  onHasLicenseChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Space wrap>
        <Select
          allowClear
          placeholder="Org status"
          style={{ width: 140 }}
          value={isActive ?? undefined}
          onChange={(v) => onIsActiveChange((v as "true" | "false") ?? null)}
          options={[
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
        <Select
          allowClear
          placeholder="Subscription"
          style={{ width: 150 }}
          value={hasLicense ?? undefined}
          onChange={(v) => onHasLicenseChange((v as "true" | "false") ?? null)}
          options={[
            { value: "true", label: "Has license" },
            { value: "false", label: "No license" },
          ]}
        />
        <Select
          allowClear
          placeholder="License status"
          style={{ width: 150 }}
          value={licenseStatus ?? undefined}
          onChange={(v) => onLicenseStatusChange((v as OrgLicenseStatus) ?? null)}
          options={LICENSE_STATUS_OPTIONS.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Name, code…"
          style={{ minWidth: 220 }}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </Space>
      <Space wrap>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
        <Link href="/wifi/billing/tenant-registration">
          <Button type="primary" icon={<PlusOutlined />}>
            Register tenant
          </Button>
        </Link>
      </Space>
    </div>
  </div>
);

export default TenantsToolbar;
