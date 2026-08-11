"use client";

import React from "react";
import { Button, DatePicker, Segmented, Space, Tag } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { PERIOD_PRESETS } from "../constant";

const { RangePicker } = DatePicker;

type PresetOption = { value: string; label: string };

type Props = {
  preset: string;
  customRange: [Dayjs | null, Dayjs | null] | null;
  dataSource?: "aggregated" | "live";
  loading?: boolean;
  /** Override default partner-insights presets (e.g. Site Analytics includes Today). */
  presets?: PresetOption[];
  onPresetChange: (preset: string) => void;
  onCustomRangeChange: (range: [Dayjs | null, Dayjs | null] | null) => void;
  onRefresh: () => void;
};

const InsightsToolbar: React.FC<Props> = ({
  preset,
  customRange,
  dataSource,
  loading,
  presets = PERIOD_PRESETS,
  onPresetChange,
  onCustomRangeChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Space wrap align="center">
      <Segmented
        value={customRange ? undefined : preset}
        options={presets.map((p) => ({ value: p.value, label: p.label }))}
        onChange={(v) => onPresetChange(String(v))}
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
