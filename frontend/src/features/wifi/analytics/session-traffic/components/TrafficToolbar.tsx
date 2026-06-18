"use client";

import React from "react";
import { Button, DatePicker, Segmented, Space } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import type { PeriodPreset } from "../types";
import { PERIOD_PRESETS } from "../constant";

const { RangePicker } = DatePicker;

type Props = {
  preset: PeriodPreset;
  customRange: [Dayjs | null, Dayjs | null] | null;
  loading?: boolean;
  dataSource?: "aggregated" | "live";
  onPresetChange: (preset: PeriodPreset) => void;
  onCustomRangeChange: (range: [Dayjs | null, Dayjs | null] | null) => void;
  onRefresh: () => void;
};

const TrafficToolbar: React.FC<Props> = ({
  preset,
  customRange,
  loading,
  dataSource,
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
    </Space>
    <Space>
      <WifiMutedText style={{ fontSize: 12 }}>
        {dataSource === "live" ? "Live session data" : "Aggregated stats"} · vs prior period
      </WifiMutedText>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
    </Space>
  </div>
);

export default TrafficToolbar;
