"use client";

import React from "react";
import { Button, DatePicker, Segmented, Space, Tag } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import type { PeriodPreset } from "../types";
import { PERIOD_PRESETS } from "../constant";
import { granularityLabel } from "../utils";
import type { TrendGranularity } from "../types";

const { RangePicker } = DatePicker;

type Props = {
  preset: PeriodPreset;
  customRange: [Dayjs | null, Dayjs | null] | null;
  trendGranularity?: TrendGranularity;
  dataSource?: "aggregated" | "live";
  loading?: boolean;
  onPresetChange: (preset: PeriodPreset) => void;
  onCustomRangeChange: (range: [Dayjs | null, Dayjs | null] | null) => void;
  onRefresh: () => void;
};

const RevenueToolbar: React.FC<Props> = ({
  preset,
  customRange,
  trendGranularity,
  dataSource,
  loading,
  onPresetChange,
  onCustomRangeChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Space wrap align="center">
      <Segmented
        value={customRange ? undefined : preset}
        options={PERIOD_PRESETS.map((p) => ({ value: p.value, label: p.label }))}
        onChange={(v) => onPresetChange(v as PeriodPreset)}
      />
      <RangePicker
        allowClear
        value={customRange}
        onChange={(dates) => onCustomRangeChange(dates)}
        format="D MMM YYYY"
        placeholder={["Custom from", "Custom to"]}
      />
      {trendGranularity ? (
        <Tag color="geekblue">{granularityLabel(trendGranularity)} trend</Tag>
      ) : null}
      {dataSource ? (
        <Tag color={dataSource === "aggregated" ? "blue" : "orange"}>
          {dataSource === "aggregated" ? "Aggregated stats" : "Live orders"}
        </Tag>
      ) : null}
    </Space>
    <Space>
      <WifiMutedText style={{ fontSize: 12 }}>
        vs previous period
      </WifiMutedText>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
    </Space>
  </div>
);

export default RevenueToolbar;
