"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { PartnerStatus, PartnersFormOptions } from "../types";
import { STATUS_OPTIONS } from "../constant";

type Props = {
  search: string;
  status: PartnerStatus | null;
  stationId: string | null;
  formOptions: PartnersFormOptions;
  loading?: boolean;
  addDisabled?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: PartnerStatus | null) => void;
  onStationChange: (stationId: string | null) => void;
  onRefresh: () => void;
  onCreate: () => void;
};

const PartnersToolbar: React.FC<Props> = ({
  search,
  status,
  stationId,
  formOptions,
  loading,
  addDisabled,
  onSearchChange,
  onStatusChange,
  onStationChange,
  onRefresh,
  onCreate,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Space wrap>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search code, name, contact…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: 260 }}
      />
      <Select
        allowClear
        placeholder="Status"
        value={status}
        onChange={onStatusChange}
        style={{ width: 140 }}
        options={STATUS_OPTIONS}
      />
      <Select
        allowClear
        showSearch
        placeholder="Site"
        value={stationId}
        onChange={onStationChange}
        optionFilterProp="label"
        style={{ width: 200 }}
        options={formOptions.stations.map((s) => ({
          value: s.id,
          label: `${s.code} — ${s.name}`,
        }))}
      />
    </Space>
    <Space>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate} disabled={addDisabled}>
        New partner
      </Button>
    </Space>
  </div>
);

export default PartnersToolbar;
