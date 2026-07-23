"use client";

import React from "react";
import { Button, Input, Select, Space, Switch } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import { DEVICE_TYPE_OPTIONS } from "../constant";
import type { DeviceType, NasDeviceOrg, NasDeviceStation } from "../types";

type Props = {
  orgs: NasDeviceOrg[];
  stations: NasDeviceStation[];
  vendors: string[];
  search: string;
  orgId: string | null;
  showOrgFilter?: boolean;
  stationId: string | null;
  vendor: string | null;
  type: DeviceType | null;
  radiusOnly: boolean;
  unassignedOnly: boolean;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onOrgChange: (orgId: string | null) => void;
  onStationChange: (stationId: string | null) => void;
  onVendorChange: (vendor: string | null) => void;
  onTypeChange: (type: DeviceType | null) => void;
  onRadiusOnlyChange: (value: boolean) => void;
  onUnassignedOnlyChange: (value: boolean) => void;
  onRefresh: () => void;
  onAdd: () => void;
};

const NasDevicesToolbar: React.FC<Props> = ({
  orgs,
  stations,
  vendors,
  search,
  orgId,
  showOrgFilter = false,
  stationId,
  vendor,
  type,
  radiusOnly,
  unassignedOnly,
  loading,
  onSearchChange,
  onOrgChange,
  onStationChange,
  onVendorChange,
  onTypeChange,
  onRadiusOnlyChange,
  onUnassignedOnlyChange,
  onRefresh,
  onAdd,
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Space wrap>
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search vendor, model, MAC, IP…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{ width: 260 }}
        />
        {showOrgFilter ? (
          <Select
            showSearch
            allowClear
            placeholder="All tenants"
            value={orgId ?? undefined}
            onChange={(v) => onOrgChange(v ?? null)}
            onClear={() => onOrgChange(null)}
            style={{ minWidth: 200 }}
            optionFilterProp="label"
            options={orgs.map((org) => ({
              value: org.id,
              label: `${org.code} — ${org.name}`,
            }))}
          />
        ) : null}
        <Select
          allowClear
          showSearch
          placeholder="Site"
          value={stationId ?? undefined}
          onChange={(v) => onStationChange(v ?? null)}
          style={{ minWidth: 220 }}
          optionFilterProp="label"
          options={stations.map((s) => ({
            value: s.id,
            label: `${s.code} — ${s.name}`,
          }))}
        />
        <Select
          allowClear
          showSearch
          placeholder="Vendor"
          value={vendor ?? undefined}
          onChange={(v) => onVendorChange(v ?? null)}
          style={{ minWidth: 150 }}
          optionFilterProp="label"
          options={vendors.map((v) => ({ value: v, label: v }))}
        />
        <Select
          value={type ?? ""}
          onChange={(v) => onTypeChange((v as DeviceType) || null)}
          style={{ minWidth: 150 }}
          options={DEVICE_TYPE_OPTIONS}
        />
      </Space>
      <Space>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
          Add device
        </Button>
      </Space>
    </div>
    <div className="flex flex-wrap items-center gap-4">
      <label className="flex items-center gap-2 text-sm">
        <Switch size="small" checked={radiusOnly} onChange={onRadiusOnlyChange} />
        RADIUS clients only
      </label>
      <label className="flex items-center gap-2 text-sm">
        <Switch size="small" checked={unassignedOnly} onChange={onUnassignedOnlyChange} />
        Unassigned to site
      </label>
    </div>
  </div>
);

export default NasDevicesToolbar;
