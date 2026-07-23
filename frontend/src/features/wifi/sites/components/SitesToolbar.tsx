"use client";

import React, { useMemo } from "react";
import { Button, Input, Select, Space } from "antd";
import { PlusOutlined, ReloadOutlined, SearchOutlined } from "@ant-design/icons";
import type { SitesFormOptions, StationStatus } from "../types";
import { STATUS_OPTIONS } from "../constant";
import { usePlaceTowns } from "@/features/system/places/usePlaceTowns";

type Props = {
  search: string;
  status: StationStatus | null;
  stationSizeId: string | null;
  township: string | null;
  formOptions: SitesFormOptions;
  loading?: boolean;
  addDisabled?: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StationStatus | null) => void;
  onTierChange: (value: string | null) => void;
  onTownshipChange: (value: string | null) => void;
  onRefresh: () => void;
  onCreate: () => void;
};

const SitesToolbar: React.FC<Props> = ({
  search,
  status,
  stationSizeId,
  township,
  formOptions,
  loading,
  addDisabled,
  onSearchChange,
  onStatusChange,
  onTierChange,
  onTownshipChange,
  onRefresh,
  onCreate,
}) => {
  const { options: townOptions, loading: townsLoading } = usePlaceTowns();

  const townshipOptions = useMemo(() => {
    const byValue = new Map(townOptions.map((o) => [o.value, o]));
    const current = township?.trim();
    if (current && !byValue.has(current)) {
      byValue.set(current, { value: current, label: current });
    }
    return [...byValue.values()];
  }, [townOptions, township]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Space wrap>
        <Select
          allowClear
          placeholder="Status"
          style={{ width: 140 }}
          value={status ?? undefined}
          onChange={(v) => onStatusChange(v ?? null)}
          options={STATUS_OPTIONS}
        />
        <Select
          allowClear
          placeholder="Capacity tier"
          style={{ minWidth: 160 }}
          value={stationSizeId ?? undefined}
          onChange={(v) => onTierChange(v ?? null)}
          options={formOptions.stationSizes.map((t) => ({
            value: t.id,
            label: `${t.name} (${t.code})`,
          }))}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Township"
          style={{ minWidth: 180 }}
          loading={townsLoading}
          value={township ?? undefined}
          onChange={(v) => onTownshipChange(v ?? null)}
          options={townshipOptions}
        />
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Code, name, location, NAS…"
          style={{ minWidth: 260 }}
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
          disabled={addDisabled}
        >
          Add site
        </Button>
      </Space>
    </div>
  );
};

export default SitesToolbar;
