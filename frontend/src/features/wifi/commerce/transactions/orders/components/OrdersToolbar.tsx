"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { OrdersFormOptions, SaleStatus } from "../types";
import { STATUS_OPTIONS } from "../constant";

type Props = {
  search: string;
  status: SaleStatus | null;
  stationId: string | null;
  resellerId: string | null;
  formOptions: OrdersFormOptions;
  showResellerFilter?: boolean;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: SaleStatus | null) => void;
  onStationChange: (stationId: string | null) => void;
  onResellerChange: (resellerId: string | null) => void;
  onRefresh: () => void;
};

const OrdersToolbar: React.FC<Props> = ({
  search,
  status,
  stationId,
  resellerId,
  formOptions,
  showResellerFilter,
  loading,
  onSearchChange,
  onStatusChange,
  onStationChange,
  onResellerChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Space wrap>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search order no, partner, token…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: 280 }}
      />
      <Select
        allowClear
        placeholder="Status"
        value={status}
        onChange={onStatusChange}
        style={{ width: 130 }}
        options={STATUS_OPTIONS}
      />
      {showResellerFilter ? (
        <Select
          allowClear
          showSearch
          placeholder="Partner"
          value={resellerId}
          onChange={onResellerChange}
          optionFilterProp="label"
          style={{ width: 200 }}
          options={formOptions.resellers.map((r) => ({
            value: r.id,
            label: `${r.code} — ${r.name}`,
          }))}
        />
      ) : null}
      <Select
        allowClear
        showSearch
        placeholder="Site"
        value={stationId}
        onChange={onStationChange}
        optionFilterProp="label"
        style={{ width: 180 }}
        options={formOptions.stations.map((s) => ({
          value: s.id,
          label: `${s.code} — ${s.name}`,
        }))}
      />
    </Space>
    <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
      Refresh
    </Button>
  </div>
);

export default OrdersToolbar;
