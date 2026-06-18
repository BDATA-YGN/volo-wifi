"use client";

import React from "react";
import { Button, DatePicker, Segmented, Space, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import type { PeriodPreset } from "../types";
import { PERIOD_PRESETS } from "../constant";

const { RangePicker } = DatePicker;

type Props = {
  preset: PeriodPreset;
  customRange: [Dayjs | null, Dayjs | null] | null;
  dataSource?: "aggregated" | "live";
  loading?: boolean;
  onPresetChange: (preset: PeriodPreset) => void;
  onCustomRangeChange: (range: [Dayjs | null, Dayjs | null] | null) => void;
  onRefresh: () => void;
};

const InsightsToolbar: React.FC<Props> = ({
  preset,
  customRange,
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
      {dataSource ? (
        <Tag color={dataSource === "aggregated" ? "blue" : "orange"}>
          {dataSource === "aggregated" ? "Daily stats" : "Live orders"}
        </Tag>
      ) : null}
    </Space>
    <Space>
      <WifiMutedText style={{ fontSize: 12 }}>vs previous period</WifiMutedText>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
    </Space>
  </div>
);

export default InsightsToolbar;
