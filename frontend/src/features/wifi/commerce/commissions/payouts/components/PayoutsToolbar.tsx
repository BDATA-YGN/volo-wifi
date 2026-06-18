"use client";

import React from "react";
import { Button, DatePicker, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import type { PayoutsFormOptions, PayoutStatus } from "../types";
import { STATUS_OPTIONS } from "../constant";

const { RangePicker } = DatePicker;

type Props = {
  search: string;
  status: PayoutStatus | null;
  resellerId: string | null;
  periodRange: [Dayjs | null, Dayjs | null] | null;
  formOptions: PayoutsFormOptions;
  loading?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (status: PayoutStatus | null) => void;
  onResellerChange: (id: string | null) => void;
  onPeriodChange: (range: [Dayjs | null, Dayjs | null] | null) => void;
  onRefresh: () => void;
  onCreate: () => void;
};

const PayoutsToolbar: React.FC<Props> = ({
  search,
  status,
  resellerId,
  periodRange,
  formOptions,
  loading,
  onSearchChange,
  onStatusChange,
  onResellerChange,
  onPeriodChange,
  onRefresh,
  onCreate,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Space wrap>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search partner, note…"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{ width: 220 }}
      />
      <Select
        allowClear
        placeholder="Status"
        value={status}
        onChange={onStatusChange}
        style={{ width: 150 }}
        options={STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
      />
      <Select
        allowClear
        showSearch
        placeholder="Partner"
        value={resellerId}
        onChange={onResellerChange}
        optionFilterProp="label"
        style={{ width: 180 }}
        options={formOptions.resellers.map((r) => ({
          value: r.id,
          label: `${r.code} — ${r.name}`,
        }))}
      />
      <RangePicker
        allowClear
        value={periodRange}
        onChange={(dates) => onPeriodChange(dates)}
        format="D MMM YYYY"
      />
    </Space>
    <Space>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
      <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
        New payout
      </Button>
    </Space>
  </div>
);

export default PayoutsToolbar;
