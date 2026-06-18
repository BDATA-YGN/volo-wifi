"use client";

import React from "react";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { VoucherRunsFormOptions } from "../types";

type Props = {
  search: string;
  planId: string | null;
  stationId: string | null;
  formOptions: VoucherRunsFormOptions;
  loading?: boolean;
  createDisabled?: boolean;
  onSearchChange: (value: string) => void;
  onPlanChange: (value: string | null) => void;
  onStationChange: (value: string | null) => void;
  onRefresh: () => void;
  onCreate: () => void;
};

const VoucherRunsToolbar: React.FC<Props> = ({
  search,
  planId,
  stationId,
  formOptions,
  loading,
  createDisabled,
  onSearchChange,
  onPlanChange,
  onStationChange,
  onRefresh,
  onCreate,
}) => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <Space wrap>
      <Select
        allowClear
        placeholder="Service plan"
        style={{ minWidth: 180 }}
        value={planId ?? undefined}
        onChange={(v) => onPlanChange(v ?? null)}
        options={formOptions.plans.map((p) => ({
          value: p.id,
          label: `${p.name} (${p.code})`,
        }))}
      />
      <Select
        allowClear
        placeholder="Site"
        style={{ minWidth: 160 }}
        value={stationId ?? undefined}
        onChange={(v) => onStationChange(v ?? null)}
        options={formOptions.stations.map((s) => ({
          value: s.id,
          label: `${s.name} (${s.code})`,
        }))}
      />
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Batch no, prefix, note…"
        style={{ minWidth: 240 }}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </Space>
    <Space wrap>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={onCreate}
        disabled={createDisabled}
      >
        New run
      </Button>
    </Space>
  </div>
);

export default VoucherRunsToolbar;
