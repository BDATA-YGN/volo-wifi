"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import { ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { PaymentMethod, PaymentsFormOptions, SaleStatus } from "../types";
import { METHOD_OPTIONS, STATUS_OPTIONS } from "../constant";

type Props = {
  search: string;
  method: PaymentMethod | null;
  orderStatus: SaleStatus | null;
  stationId: string | null;
  resellerId: string | null;
  formOptions: PaymentsFormOptions;
  showResellerFilter?: boolean;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onMethodChange: (method: PaymentMethod | null) => void;
  onOrderStatusChange: (status: SaleStatus | null) => void;
  onStationChange: (stationId: string | null) => void;
  onResellerChange: (resellerId: string | null) => void;
  onRefresh: () => void;
};

const PaymentsToolbar: React.FC<Props> = ({
  search,
  method,
  orderStatus,
  stationId,
  resellerId,
  formOptions,
  showResellerFilter,
  loading,
  onSearchChange,
  onMethodChange,
  onOrderStatusChange,
  onStationChange,
  onResellerChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Space wrap>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search ref no, order, partner…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: 280 }}
      />
      <Select
        allowClear
        placeholder="Method"
        value={method}
        onChange={onMethodChange}
        style={{ width: 150 }}
        options={METHOD_OPTIONS}
      />
      <Select
        allowClear
        placeholder="Payment status"
        value={orderStatus}
        onChange={onOrderStatusChange}
        style={{ width: 160 }}
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

export default PaymentsToolbar;
