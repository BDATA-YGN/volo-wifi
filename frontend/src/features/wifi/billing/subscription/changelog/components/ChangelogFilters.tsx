"use client";

import React from "react";
import { Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { CHANGE_TYPE_OPTIONS } from "../constant";
import type { LicenseChangeType } from "../types";

type Props = {
  search: string;
  changeType: LicenseChangeType | null;
  tierCode: string | null;
  tierOptions: { code: string; name: string }[];
  onSearchChange: (value: string) => void;
  onChangeTypeChange: (value: LicenseChangeType | null) => void;
  onTierCodeChange: (value: string | null) => void;
};

const ChangelogFilters: React.FC<Props> = ({
  search,
  changeType,
  tierCode,
  tierOptions,
  onSearchChange,
  onChangeTypeChange,
  onTierCodeChange,
}) => (
  <div className="flex flex-wrap gap-3">
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder="Search reason or admin…"
      value={search}
      onChange={(e) => onSearchChange(e.target.value)}
      style={{ maxWidth: 280 }}
    />
    <Select
      value={changeType ?? ""}
      onChange={(v) => onChangeTypeChange((v as LicenseChangeType) || null)}
      style={{ minWidth: 180 }}
      options={CHANGE_TYPE_OPTIONS}
    />
    <Select
      allowClear
      placeholder="All tiers"
      value={tierCode ?? undefined}
      onChange={(v) => onTierCodeChange(v ?? null)}
      style={{ minWidth: 140 }}
      options={tierOptions.map((t) => ({ value: t.code, label: t.code }))}
    />
  </div>
);

export default ChangelogFilters;
