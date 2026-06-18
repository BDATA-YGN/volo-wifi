"use client";

import React from "react";
import { Button, Segmented, Space, Switch } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import type { WindowHours } from "../types";
import { WINDOW_OPTIONS } from "../constant";


type Props = {
  windowHours: WindowHours;
  generatedAt?: string;
  autoRefresh: boolean;
  loading?: boolean;
  onWindowChange: (hours: WindowHours) => void;
  onAutoRefreshChange: (value: boolean) => void;
  onRefresh: () => void;
};

const LiveOpsToolbar: React.FC<Props> = ({
  windowHours,
  generatedAt,
  autoRefresh,
  loading,
  onWindowChange,
  onAutoRefreshChange,
  onRefresh,
}) => (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <Space wrap align="center">
      <Segmented
        value={windowHours}
        options={WINDOW_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        onChange={(v) => onWindowChange(v as WindowHours)}
      />
      <Space size="small">
        <Switch size="small" checked={autoRefresh} onChange={onAutoRefreshChange} />
        <WifiMutedText style={{ fontSize: 12 }}>
          Auto-refresh 30s
        </WifiMutedText>
      </Space>
    </Space>
    <Space>
      <WifiMutedText style={{ fontSize: 12 }}>
        {generatedAt
          ? `Live snapshot · ${dayjs(generatedAt).format("HH:mm:ss")}`
          : "Near-real-time operations"}
      </WifiMutedText>
      <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
        Refresh
      </Button>
    </Space>
  </div>
);

export default LiveOpsToolbar;
