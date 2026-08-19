"use client";

import React from "react";
import { Button, DatePicker, Space } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { dateRangePresets } from "../constant";

const { RangePicker } = DatePicker;

type Props = {
  customRange: [Dayjs | null, Dayjs | null] | null;
  loading?: boolean;
  onCustomRangeChange: (range: [Dayjs | null, Dayjs | null] | null) => void;
  onRefresh: () => void;
};

const TokensToolbar: React.FC<Props> = ({
  customRange,
  loading,
  onCustomRangeChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Space wrap align="center">
      <RangePicker
        allowClear
        value={customRange}
        onChange={(dates) => onCustomRangeChange(dates)}
        format="D MMM YYYY"
        placeholder={["From", "To"]}
        presets={dateRangePresets()}
        disabledDate={(current) => Boolean(current && current.isAfter(dayjs().endOf("day")))}
      />
    </Space>
    <Space>
      <WifiMutedText style={{ fontSize: 12 }}>
        Lifecycle events vs prior period
      </WifiMutedText>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
    </Space>
  </div>
);

export default TokensToolbar;
