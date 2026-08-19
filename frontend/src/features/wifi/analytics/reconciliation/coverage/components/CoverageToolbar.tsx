"use client";

import React from "react";
import { Button, Space } from "antd";
import { WifiMutedText } from "@/features/wifi/shared/components/WifiMutedText";
import { ReloadOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

type Props = {
  generatedAt?: string;
  loading?: boolean;
  onRefresh: () => void;
};

const CoverageToolbar: React.FC<Props> = ({ generatedAt, loading, onRefresh }) => (
  <Space>
    <WifiMutedText style={{ fontSize: 12 }}>
      {generatedAt
        ? `Snapshot · ${dayjs(generatedAt).format("D MMM YYYY, HH:mm")}`
        : "Sealed horizon"}
    </WifiMutedText>
    <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
      Refresh
    </Button>
  </Space>
);

export default CoverageToolbar;
