"use client";

import React, { useMemo } from "react";
import { Button, DatePicker, Select, Space, Switch, Typography } from "antd";
import { PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type { VoucherRunsFormOptions } from "../types";
import { usePlaceTowns } from "@/features/system/places/usePlaceTowns";

const { RangePicker } = DatePicker;
const { Text } = Typography;

type Props = {
  planId: string | null;
  stationId: string | null;
  township: string | null;
  stationSizeId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  hasBalance: boolean;
  formOptions: VoucherRunsFormOptions;
  loading?: boolean;
  createDisabled?: boolean;
  onPlanChange: (value: string | null) => void;
  onStationChange: (value: string | null) => void;
  onTownshipChange: (value: string | null) => void;
  onTierChange: (value: string | null) => void;
  onDateRangeChange: (dateFrom: string | null, dateTo: string | null) => void;
  onHasBalanceChange: (value: boolean) => void;
  onRefresh: () => void;
  onCreate: () => void;
};

const VoucherRunsToolbar: React.FC<Props> = ({
  planId,
  stationId,
  township,
  stationSizeId,
  dateFrom,
  dateTo,
  hasBalance,
  formOptions,
  loading,
  createDisabled,
  onPlanChange,
  onStationChange,
  onTownshipChange,
  onTierChange,
  onDateRangeChange,
  onHasBalanceChange,
  onRefresh,
  onCreate,
}) => {
  const { options: townOptions, loading: townsLoading } = usePlaceTowns();

  const townshipOptions = useMemo(() => {
    const byValue = new Map(townOptions.map((o) => [o.value, o]));
    for (const s of formOptions.stations) {
      const t = s.township?.trim();
      if (t && !byValue.has(t)) byValue.set(t, { value: t, label: t });
    }
    if (township && !byValue.has(township)) {
      byValue.set(township, { value: township, label: township });
    }
    return [...byValue.values()];
  }, [townOptions, formOptions.stations, township]);

  const stationOptions = useMemo(() => {
    return formOptions.stations
      .filter((s) => {
        if (township && (s.township ?? "").toLowerCase() !== township.toLowerCase()) {
          return false;
        }
        if (stationSizeId && s.stationSizeId !== stationSizeId) return false;
        return true;
      })
      .map((s) => ({
        value: s.id,
        label: `${s.name} (${s.code})`,
      }));
  }, [formOptions.stations, township, stationSizeId]);

  const rangeValue: [Dayjs, Dayjs] | null =
    dateFrom && dateTo ? [dayjs(dateFrom), dayjs(dateTo)] : null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Space wrap>
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
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
          showSearch
          optionFilterProp="label"
          placeholder="Township"
          style={{ minWidth: 180 }}
          loading={townsLoading}
          value={township ?? undefined}
          onChange={(v) => onTownshipChange(v ?? null)}
          options={townshipOptions}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Tier"
          style={{ minWidth: 140 }}
          value={stationSizeId ?? undefined}
          onChange={(v) => onTierChange(v ?? null)}
          options={(formOptions.stationSizes ?? []).map((t) => ({
            value: t.id,
            label: `${t.name} (${t.code})`,
          }))}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="Site"
          style={{ minWidth: 280 }}
          value={stationId ?? undefined}
          onChange={(v) => onStationChange(v ?? null)}
          options={stationOptions}
        />
        <RangePicker
          allowClear
          value={rangeValue}
          format="D MMM YYYY"
          style={{ minWidth: 260 }}
          onChange={(dates) => {
            if (!dates?.[0] || !dates?.[1]) {
              onDateRangeChange(null, null);
              return;
            }
            onDateRangeChange(dates[0].format("YYYY-MM-DD"), dates[1].format("YYYY-MM-DD"));
          }}
        />
        <Space size={6}>
          <Switch size="small" checked={hasBalance} onChange={onHasBalanceChange} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Has balance
          </Text>
        </Space>
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
};

export default VoucherRunsToolbar;
