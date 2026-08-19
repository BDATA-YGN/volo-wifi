"use client";

import React from "react";
import { Button, DatePicker, Select, Space } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { DATE_LOOKBACK_DAYS, REFRESH_INTERVAL_OPTIONS } from "../constant";

type Props = {
  date: string;
  generatedAt?: string;
  refreshMs: number;
  loading?: boolean;
  onDateChange: (date: string) => void;
  onRefreshMsChange: (ms: number) => void;
  onRefresh: () => void;
};

const LiveOpsToolbar: React.FC<Props> = ({
  date,
  generatedAt,
  refreshMs,
  loading,
  onDateChange,
  onRefreshMsChange,
  onRefresh,
}) => {
  const today = dayjs().startOf("day");
  const earliest = today.subtract(DATE_LOOKBACK_DAYS - 1, "day");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <Space wrap align="end">
        <div>
          <WifiMutedText style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
            Date
          </WifiMutedText>
          <DatePicker
            allowClear={false}
            value={dayjs(date)}
            format="D MMM YYYY"
            disabledDate={(current: Dayjs) =>
              current.startOf("day").isAfter(today) || current.startOf("day").isBefore(earliest)
            }
            onChange={(value) => {
              if (value) onDateChange(value.format("YYYY-MM-DD"));
            }}
          />
        </div>
        <div>
          <WifiMutedText style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
            Refresh
          </WifiMutedText>
          <Select
            value={refreshMs}
            style={{ minWidth: 110 }}
            options={REFRESH_INTERVAL_OPTIONS}
            onChange={onRefreshMsChange}
          />
        </div>
      </Space>
      <Space>
        <WifiMutedText style={{ fontSize: 12 }}>
          {generatedAt
            ? `Snapshot · ${dayjs(generatedAt).format("HH:mm:ss")}`
            : "Live operations"}
        </WifiMutedText>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
      </Space>
    </div>
  );
};

export default LiveOpsToolbar;
