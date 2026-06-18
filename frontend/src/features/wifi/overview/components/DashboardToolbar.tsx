"use client";

import React from "react";
import { Button, Space, Switch } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";


type Props = {
  generatedAt?: string;
  autoRefresh: boolean;
  loading?: boolean;
  onAutoRefreshChange: (value: boolean) => void;
  onRefresh: () => void;
};

const DashboardToolbar: React.FC<Props> = ({
  generatedAt,
  autoRefresh,
  loading,
  onAutoRefreshChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <Space size="small">
      <Switch size="small" checked={autoRefresh} onChange={onAutoRefreshChange} />
      <WifiMutedText style={{ fontSize: 12 }}>
        Auto-refresh 60s
      </WifiMutedText>
    </Space>
    <Space>
      <WifiMutedText style={{ fontSize: 12 }}>
        {generatedAt
          ? `Updated ${dayjs(generatedAt).format("HH:mm:ss")}`
          : "Operational KPI dashboard"}
      </WifiMutedText>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
    </Space>
  </div>
);

export default DashboardToolbar;
