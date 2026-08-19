"use client";

import React from "react";
import { Button, DatePicker, Space } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";

type Props = {
  month: string;
  loading?: boolean;
  onMonthChange: (month: string) => void;
  onRefresh: () => void;
};

const RevenueToolbar: React.FC<Props> = ({
  month,
  loading,
  onMonthChange,
  onRefresh,
}) => {
  const thisMonth = dayjs().startOf("month");

  return (
    <Space wrap align="end">
      <div>
        <WifiMutedText style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
          Month
        </WifiMutedText>
        <DatePicker
          picker="month"
          allowClear={false}
          value={dayjs(`${month}-01`)}
          format="MMM YYYY"
          disabledDate={(current: Dayjs) => current.startOf("month").isAfter(thisMonth)}
          onChange={(value) => {
            if (value) onMonthChange(value.format("YYYY-MM"));
          }}
        />
      </div>
      <Space>
        <WifiMutedText style={{ fontSize: 12 }}>vs previous month</WifiMutedText>
        <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
          Refresh
        </Button>
      </Space>
    </Space>
  );
};

export default RevenueToolbar;
