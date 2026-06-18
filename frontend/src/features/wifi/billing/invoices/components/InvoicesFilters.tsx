"use client";

import React from "react";
import { Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { INVOICE_STATUS_OPTIONS } from "../constant";
import type { InvoiceOrgSummary, InvoiceStatus } from "../types";

type Props = {
  orgs: InvoiceOrgSummary[];
  orgId: string | null;
  status: InvoiceStatus | null;
  search: string;
  onOrgChange: (orgId: string | null) => void;
  onStatusChange: (status: InvoiceStatus | null) => void;
  onSearchChange: (search: string) => void;
};

const InvoicesFilters: React.FC<Props> = ({
  orgs,
  orgId,
  status,
  search,
  onOrgChange,
  onStatusChange,
  onSearchChange,
}) => (
  <div className="flex flex-wrap gap-3">
    <Select
      showSearch
      allowClear
      placeholder="All tenants"
      value={orgId ?? undefined}
      onChange={(v) => onOrgChange(v ?? null)}
      onClear={() => onOrgChange(null)}
      style={{ minWidth: 220 }}
      optionFilterProp="label"
      options={orgs.map((row) => ({
        value: row.org.id,
        label: `${row.org.code} — ${row.org.name}`,
      }))}
    />
    <Select
      value={status ?? ""}
      onChange={(v) => onStatusChange((v as InvoiceStatus) || null)}
      style={{ minWidth: 160 }}
      options={INVOICE_STATUS_OPTIONS}
    />
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder="Search invoice no. or tenant…"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      style={{ maxWidth: 300 }}
    />
  </div>
);

export default InvoicesFilters;
